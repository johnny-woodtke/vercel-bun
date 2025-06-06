import { resolve } from "path";

import type { Handler } from "./types";

let handler: Handler | null = null;

const handlerPath = resolve(process.cwd(), process.env._HANDLER ?? "");

export async function getHandler(): Promise<Handler> {
  if (handler) return handler;

  const mod = await import(handlerPath);
  handler = mod.default;

  if (typeof handler !== "function") {
    throw new Error(
      `Handler function not found in "${handlerPath}". Make sure it exports a default function.`
    );
  }

  return handler;
}
