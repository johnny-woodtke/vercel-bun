/**
 * The handler function that user code must implement.
 *
 * This is the main entry point for your Lambda function. It receives a standard
 * Web API Request object and must return a Promise that resolves to a Response object.
 * The runtime will automatically handle conversion between the AWS Lambda event format
 * and the Web API Request/Response format.
 *
 * @param req - A Web API Request object containing the HTTP request data
 * @returns A Promise that resolves to a Web API Response object
 */
export type Handler = (req: Request) => Promise<Response>;

/**
 * The payload structure received from the AWS Lambda Runtime API's next invocation endpoint.
 *
 * This represents the raw event data that AWS Lambda sends to the runtime when requesting
 * the next function invocation. The payload contains the HTTP request details that need
 * to be transformed into a Web API Request object for the user's handler function.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html#runtimes-api-next
 */
export type GetNextInvocationResponsePayload = {
  body: {
    /** The request body content, if present */
    body?: string;
    /** The encoding format of the body (typically "base64" for binary content) */
    encoding?: BufferEncoding;
    /** Feature flags indicating runtime capabilities */
    features: Record<string, boolean>;
    /** HTTP headers from the original request, including required forwarded protocol header */
    headers: Record<string, string> & {
      "x-forwarded-proto": string;
    };
    /** The host header from the original request */
    host: string;
    /** The HTTP method (GET, POST, etc.) */
    method: string;
    /** The request path including query parameters */
    path: string;
    /** Timestamp when the invocation was initiated */
    invokedAt: number;
    /** Maximum execution duration allowed for this invocation */
    maxDuration: number;
  };
  /** The AWS Lambda action type identifier */
  Action: string;
};

/**
 * The response payload structure sent back to the AWS Lambda Runtime API.
 *
 * This represents the transformed response data that gets sent to AWS Lambda's
 * invocation response endpoint after the user's handler function completes.
 * The runtime converts the Web API Response object into this format.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html#runtimes-api-response
 */
export type PostInvocationResponsePayload = {
  /** The response body content, base64-encoded if it exists */
  body?: string;
  /** The encoding format used for the body content */
  encoding?: "base64" & BufferEncoding;
  /** The HTTP status code (200, 404, 500, etc.) */
  statusCode: number;
  /** HTTP response headers as key-value pairs */
  headers: Record<string, string | string[]>;
};

/**
 * The error payload structure for reporting function or runtime errors to AWS Lambda.
 *
 * This follows the standard AWS Lambda error format and is used when reporting
 * both initialization errors and invocation errors back to the runtime API.
 * The error information helps with debugging and is included in CloudWatch logs.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html#runtimes-api-initerror
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html#runtimes-api-invokeerror
 */
export type ErrorInvocationBody = {
  /** A human-readable error description */
  errorMessage: string;
  /** The error type or class name */
  errorType: string;
  /** Stack trace lines for debugging the error location */
  stackTrace: string[];
};
