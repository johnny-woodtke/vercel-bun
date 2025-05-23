import { Buffer } from "node:buffer";

import type { VercelRequestPayload, VercelResponsePayload } from "./types";

export function fromVercelRequest(payload: VercelRequestPayload): Request {
  const headers = new Headers(payload.headers);
  const base = `${headers.get("x-forwarded-proto")}://${headers.get(
    "x-forwarded-host"
  )}`;
  const url = new URL(payload.path, base);
  const body = payload.body ? Buffer.from(payload.body, "base64") : undefined;

  return new Request(url.href, { method: payload.method, headers, body });
}

export function headersToVercelHeaders(
  headers: Headers
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [name, value] of headers) {
    const current = result[name];

    if (typeof current === "string") {
      result[name] = [current, value];
      continue;
    }

    if (Array.isArray(current)) {
      current.push(value);
      continue;
    }

    result[name] = value;
  }

  return result;
}

export async function toVercelResponse(
  res: Response
): Promise<VercelResponsePayload> {
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
