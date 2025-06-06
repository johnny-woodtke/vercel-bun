import type {
  ErrorInvocationBody,
  GetNextInvocationResponsePayload,
  PostInvocationRequestPayload,
} from "./types";

const baseUrl =
  `http://${process.env.AWS_LAMBDA_RUNTIME_API}/2018-06-01` as const;

const nextInvocationUrl = `${baseUrl}/runtime/invocation/next` as const;

function invocationResponseUrl<TAwsRequestId extends string>(
  awsRequestId: TAwsRequestId
) {
  return `${baseUrl}/runtime/invocation/${awsRequestId}/response` as const;
}

const initializationErrorUrl = `${baseUrl}/runtime/init/error` as const;

function invocationErrorUrl<TAwsRequestId extends string>(
  awsRequestId: TAwsRequestId
) {
  return `${baseUrl}/runtime/invocation/${awsRequestId}/error` as const;
}

const lambdaRuntimeAwsRequestIdHeader =
  "Lambda-Runtime-Aws-Request-Id" as const;

const lambdaRuntimeFunctionErrorTypeHeader =
  "Lambda-Runtime-Function-Error-Type" as const;

/**
 * Implements the AWS Lambda Runtime API.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-custom.html
 */
export const Runtime = {
  async getNextInvocation(): Promise<{
    request: Request;
    awsRequestId: string;
  }> {
    // Get the next invocation from the runtime API
    const res = await fetch(nextInvocationUrl, {
      method: "GET",
    });

    // Throw an error if the response is not OK
    if (!res.ok) {
      throw new Error(
        `Failed to get next invocation: ${res.status} ${res.statusText}`
      );
    }

    // Get the AWS request ID from the response headers
    const awsRequestId = res.headers.get(lambdaRuntimeAwsRequestIdHeader);
    if (!awsRequestId) {
      throw new Error("No AWS request ID found");
    }

    // Parse the response body
    const payload: GetNextInvocationResponsePayload = await res
      .json()
      .then((res) => {
        res.body = JSON.parse(res.body);
        return res;
      });

    console.log("next invocation response payload");
    console.log(JSON.stringify(payload, null, 2));

    // Return the payload transformed into a Request object and the AWS request ID
    return {
      request: new Request(
        `${payload.body.headers["x-forwarded-proto"]}://${payload.body.host}${payload.body.path}`,
        {
          method: payload.body.method,
          headers: new Headers(payload.body.headers),
          body: payload.body.body
            ? Buffer.from(payload.body.body, payload.body.encoding || "base64")
            : undefined,
        }
      ),
      awsRequestId,
    };
  },

  async postInvocationResponse<TAwsRequestId extends string>(
    awsRequestId: TAwsRequestId,
    response: Response
  ): Promise<void> {
    // Convert the response body to a base64 string
    const body = await response
      .arrayBuffer()
      .then((buffer) =>
        buffer.byteLength > 0
          ? Buffer.from(buffer).toString("base64")
          : undefined
      );

    // Post the response to the runtime API
    const res = await fetch(invocationResponseUrl(awsRequestId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statusCode: response.status,
        headers: response.headers.toJSON(),
        encoding: body ? "base64" : undefined,
        body,
      } satisfies PostInvocationRequestPayload),
    });

    // Throw an error if the response is not OK
    if (!res.ok) {
      throw new Error(
        `Failed to post invocation response: ${res.status} ${res.statusText}`
      );
    }
  },

  async postInitializationError(error: ErrorInvocationBody): Promise<void> {
    const res = await fetch(initializationErrorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [lambdaRuntimeFunctionErrorTypeHeader]: error.errorType,
      },
      body: JSON.stringify(error),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to post initialization error: ${res.status} ${res.statusText}`
      );
    }
  },

  async postInvocationError<TAwsRequestId extends string>(
    awsRequestId: TAwsRequestId,
    error: ErrorInvocationBody
  ): Promise<void> {
    const res = await fetch(invocationErrorUrl(awsRequestId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [lambdaRuntimeFunctionErrorTypeHeader]: error.errorType,
      },
      body: JSON.stringify(error),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to post invocation error: ${res.status} ${res.statusText}`
      );
    }
  },
} as const;
