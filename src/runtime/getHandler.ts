import { HANDLER_PATH } from "./constants";
import type { Handler } from "./types";

let handler: Handler | null = null;

export async function getHandler(): Promise<Handler> {
  if (handler) return handler;

  try {
    const mod = await import(HANDLER_PATH);
    handler = mod.default;

    if (typeof handler !== "function") {
      throw new Error(
        `Handler function not found in "${HANDLER_PATH}". Make sure it exports a default function.`
      );
    }

    return handler;
  } catch (e: any) {
    console.error("getHandler Error:", e.message);
    throw e;
  }
}
