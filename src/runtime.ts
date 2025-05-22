#!/usr/bin/env bun
// Runtime for AWS Lambda using Bun

import { file, write } from "bun";
import { join } from "path";
import { tmpdir } from "os";
import { mkdtemp } from "fs/promises";
import { Readable } from "stream";

// Global state for current request
let statusCode = 200;
let headers = { "content-type": "text/plain; charset=utf8" };

interface Event {
  body?: string;
  encoding?: string;
  [key: string]: any;
}

async function runtimeApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `http://${process.env.AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/${endpoint}`;
  return await fetch(url, options);
}

async function runtimeInit() {
  // Initialize user code by importing handler
  try {
    await import(process.env._HANDLER || "");
  } catch (error) {
    const errorMessage = `Initialization failed for '${
      process.env._HANDLER
    }' (exit code ${error instanceof Error ? error.message : String(error)})`;
    console.error(errorMessage);

    await runtimeApi("init/error", {
      method: "POST",
      body: JSON.stringify({ errorMessage }),
    });

    process.exit(1);
  }

  // Process events
  while (true) {
    await runtimeNext();
  }
}

async function runtimeNext() {
  // Reset response state
  statusCode = 200;
  headers = { "content-type": "text/plain; charset=utf8" };

  // Get next event
  const invocationResponse = await runtimeApi("invocation/next");
  const event = (await invocationResponse.json()) as Event;
  const requestId = invocationResponse.headers.get(
    "lambda-runtime-aws-request-id"
  );

  if (!requestId) {
    console.error("No request ID found in invocation response");
    return;
  }

  // Create temp file for body output
  const tempDir = await mkdtemp(join(tmpdir(), "lambda-"));
  const bodyPath = join(tempDir, "body");

  try {
    // Prepare body input if needed
    let bodyBuffer: Buffer | null = null;

    if (event.body) {
      let body = event.body;
      if (event.encoding === "base64") {
        body = atob(body);
      }
      bodyBuffer = Buffer.from(body);
    }

    // Execute handler function
    const handlerModule = await import(process.env._HANDLER || "");
    const handler = handlerModule.handler;

    if (typeof handler !== "function") {
      throw new Error(`Handler function not found in ${process.env._HANDLER}`);
    }

    // Execute the handler with the event and capture output
    let responseBody = "";

    // Create a readable stream from the body buffer if needed
    const bodyStream = bodyBuffer ? Readable.from(bodyBuffer) : null;

    // Call the handler and await its response
    const result = await Promise.resolve(handler(event, bodyStream));

    // Handle the result
    if (result !== undefined && result !== null) {
      responseBody = String(result);
    }

    // Write the response to file using Bun's optimized file API
    await write(bodyPath, responseBody);

    // Send the response
    const base64Body = btoa(responseBody);

    const response = {
      statusCode,
      headers,
      encoding: "base64",
      body: base64Body,
    };

    await runtimeApi(`invocation/${requestId}/response`, {
      method: "POST",
      body: JSON.stringify(response),
    });
  } catch (error) {
    const errorMessage = `Invocation failed for 'handler' function in '${
      process.env._HANDLER
    }' (${error instanceof Error ? error.message : String(error)})`;
    console.error(errorMessage);

    await runtimeApi(`invocation/${requestId}/error`, {
      method: "POST",
      body: JSON.stringify({ errorMessage }),
    });
  }
}

// Helper functions for setting response parameters
globalThis.http_response_code = function (code: number) {
  statusCode = code;
};

globalThis.http_response_header = function (name: string, value: string) {
  headers = {
    ...headers,
    [name.toLowerCase()]: value,
  };
};

globalThis.http_response_redirect = function (
  location: string,
  code: number = 302
) {
  http_response_code(code);
  http_response_header("location", location);
};

globalThis.http_response_json = function () {
  http_response_header("content-type", "application/json; charset=utf8");
};

// Declare types for global functions
declare global {
  function http_response_code(code: number): void;
  function http_response_header(name: string, value: string): void;
  function http_response_redirect(location: string, code?: number): void;
  function http_response_json(): void;
}

// Start the runtime
runtimeInit().catch((error) => {
  console.error("Runtime initialization failed:", error);
  process.exit(1);
});
