export type Handler = (req: Request) => Promise<Response>;

export type GetNextInvocationResponsePayload = {
  body: {
    body?: string;
    encoding?: BufferEncoding;
    features: Record<string, boolean>;
    headers: Record<string, string> & {
      "x-forwarded-proto": string;
    };
    host: string;
    method: string;
    path: string;
    invokedAt: number;
    maxDuration: number;
  };
  Action: string;
};

export type PostInvocationRequestPayload = {
  body?: string;
  encoding?: "base64" & BufferEncoding;
  statusCode: number;
  headers: Record<string, string | string[]>;
};

export type ErrorInvocationBody = {
  errorMessage: string;
  errorType: string;
  stackTrace: string[];
};
