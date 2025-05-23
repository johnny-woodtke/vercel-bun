import { RUNTIME_PATH } from "./constants";
import { httpRequest2Promise, performRequest } from "./http";
import type { VercelResponsePayload } from "./types";

export async function nextInvocation() {
  return httpRequest2Promise<{ event: any; awsRequestId: string }>(
    `http://${process.env.AWS_LAMBDA_RUNTIME_API}/${RUNTIME_PATH}/invocation/next`,
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
            } catch (e) {
              reject(e);
            }
          });
        }
      );
    }
  );
}

export async function invokeResponse(
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

export function invokeError(err: Error, awsRequestId: string) {
  return postError(`invocation/${awsRequestId}/error`, err);
}

export async function postError(path: string, err: Error): Promise<void> {
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
