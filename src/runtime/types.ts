export type Handler = (req: Request) => Promise<Response>;

export interface VercelRequestPayload {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
}

export interface VercelResponsePayload {
  statusCode: number;
  headers: Record<string, string | string[]>;
  encoding: "base64";
  body: string;
}
