import { webhookCallback } from "grammy";

import { bot } from "@/commands";

const handler = webhookCallback(bot, "std/http");

if (Bun.env.NODE_ENV !== "production") {
  const port = Bun.env.API_PORT || 3000;

  Bun.serve({
    port,
    fetch: handler,
  });

  console.log(`🚀 grammY is running at http://localhost:${port}/api`);
}

export default handler;
