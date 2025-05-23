import { Buffer } from "node:buffer";
import { request as httpRequest } from "node:http";

type Handler = (
  req: Request,
  connInfo: ConnInfo
) => Promise<Response> | Response;

interface ConnInfo {
  remoteAddr: {
    hostname: string;
    port: number;
    transport: string;
  };
}

interface VercelRequestPayload {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
}

interface VercelResponsePayload {
  statusCode: number;
  headers: Record<string, string | string[]>;
  encoding: "base64";
  body: string;
}

const RUNTIME_PATH = "2018-06-01/runtime";
const { _HANDLER, ENTRYPOINT, AWS_LAMBDA_RUNTIME_API } = process.env;

function fromVercelRequest(payload: VercelRequestPayload): Request {
  const headers = new Headers(payload.headers);
  const base = `${headers.get("x-forwarded-proto")}://${headers.get(
    "x-forwarded-host"
  )}`;
  const url = new URL(payload.path, base);
  const body = payload.body ? Buffer.from(payload.body, "base64") : undefined;

  return new Request(url.href, { method: payload.method, headers, body });
}

function headersToVercelHeaders(
  headers: Headers
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [name, value] of headers) {
    const current = result[name];
    if (typeof current === "string") {
      result[name] = [current, value];
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      result[name] = value;
    }
  }
  return result;
}

async function toVercelResponse(res: Response): Promise<VercelResponsePayload> {
  const bodyBuffer = await res.arrayBuffer();
  const body =
    bodyBuffer.byteLength > 0 ? Buffer.from(bodyBuffer).toString("base64") : "";

  return {
    statusCode: res.status,
    headers: headersToVercelHeaders(res.headers),
    encoding: "base64",
    body,
  };
}

async function httpRequest2Promise<T>(
  url: string,
  options: any = {},
  responseHandler: (res: any) => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, options, (res) => {
      responseHandler(res).then(resolve).catch(reject);
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function nextInvocation() {
  return httpRequest2Promise<{ event: any; awsRequestId: string }>(
    `http://${AWS_LAMBDA_RUNTIME_API}/${RUNTIME_PATH}/invocation/next`,
    {},
    async (res) => {
      // Set trace ID if available
      const traceId = res.headers["lambda-runtime-trace-id"];
      if (typeof traceId === "string") {
        process.env._X_AMZN_TRACE_ID = traceId;
      } else {
        delete process.env._X_AMZN_TRACE_ID;
      }

      // Get request ID
      const awsRequestId = res.headers["lambda-runtime-aws-request-id"];
      if (typeof awsRequestId !== "string") {
        throw new Error(
          'Did not receive "lambda-runtime-aws-request-id" header'
        );
      }

      // Get response body
      let body = "";
      return new Promise<{ event: any; awsRequestId: string }>(
        (resolve, reject) => {
          res.on("data", (chunk: string) => (body += chunk));
          res.on("end", () => {
            try {
              resolve({ event: JSON.parse(body), awsRequestId });
            } catch (err) {
              reject(err);
            }
          });
        }
      );
    }
  );
}

async function performRequest(path: string, options: any = {}) {
  return httpRequest2Promise<{ status: number; headers: any; body: string }>(
    `http://${AWS_LAMBDA_RUNTIME_API}/${RUNTIME_PATH}/${path}`,
    options,
    async (res) => {
      let body = "";
      return new Promise((resolve) => {
        res.on("data", (chunk: string) => (body += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            body,
          });
        });
      });
    }
  );
}

async function invokeResponse(
  result: VercelResponsePayload,
  awsRequestId: string
) {
  const res = await performRequest(`invocation/${awsRequestId}/response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });

  if (res.status !== 202) {
    throw new Error(
      `Unexpected "/invocation/response" response: ${JSON.stringify(res)}`
    );
  }
}

function invokeError(err: Error, awsRequestId: string) {
  return postError(`invocation/${awsRequestId}/error`, err);
}

async function postError(path: string, err: Error): Promise<void> {
  const lambdaErr = {
    errorType: err.name,
    errorMessage: err.message,
    stackTrace: (err.stack || "").split("\n").slice(1),
  };

  const res = await performRequest(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lambda-Runtime-Function-Error-Type": "Unhandled",
    },
    body: JSON.stringify(lambdaErr),
  });

  if (res.status !== 202) {
    throw new Error(`Unexpected "${path}" response: ${JSON.stringify(res)}`);
  }
}

async function processEvents(): Promise<void> {
  let handler: Handler | null = null;

  while (true) {
    try {
      const { event, awsRequestId } = await nextInvocation();

      try {
        // Load handler if not already loaded
        if (!handler) {
          try {
            const mod = await import(`./${_HANDLER}`);
            handler = mod.default;
            if (typeof handler !== "function") {
              throw new Error(
                `Handler function not found in "${_HANDLER}". Make sure it exports a default function.`
              );
            }
          } catch (importError: any) {
            if (importError.code === "ERR_MODULE_NOT_FOUND") {
              throw new Error(
                `Cannot find handler file: "./${_HANDLER}". Make sure the file exists and is correctly referenced in your config.`
              );
            }
            throw importError;
          }
        }

        // Process the request
        const payload = JSON.parse(event.body) as VercelRequestPayload;
        const req = fromVercelRequest(payload);
        const connInfo: ConnInfo = {
          remoteAddr: {
            hostname: "127.0.0.1",
            port: 0,
            transport: "tcp",
          },
        };

        // Run user code and send response
        const res = await handler(req, connInfo);
        const result = await toVercelResponse(res);
        await invokeResponse(result, awsRequestId);
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error(err);
        await invokeError(err, awsRequestId);
      }
    } catch (err) {
      console.error("Lambda runtime error:", err);
      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

if (_HANDLER) {
  // Runtime - execute the runtime loop
  processEvents().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  // Build - import the entrypoint so that it gets cached
  import(ENTRYPOINT!).catch((err) => {
    console.error("Failed to import entrypoint:", err);
    process.exit(1);
  });
}
