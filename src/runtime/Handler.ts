import { resolve } from "path";

import type { Handler as HandlerType } from "./types";

/**
 * The path to import the handler function.
 */
const handlerPath = resolve(process.cwd(), process.env._HANDLER ?? "");

/**
 * Handler function utils
 */
export const Handler = {
  /**
   * Gets the handler function.
   */
  async get(): Promise<HandlerType> {
    const handler = await import(handlerPath).then((mod) => mod.default);

    if (typeof handler !== "function") {
      throw new Error(
        `Handler function not found in "${handlerPath}". Make sure it exports a default function.`
      );
    }

    return handler;
  },
} as const;
