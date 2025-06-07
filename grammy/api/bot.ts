import { webhookCallback } from "grammy";

import { bot } from "@/commands";

// Create handler for webhook
const handler = webhookCallback(bot, "std/http");

// Start dev server if not in production
if (Bun.env.NODE_ENV !== "production") {
  Bun.serve({
    port: Bun.env.API_PORT || 3000,
    fetch: handler,
  });
}

// Export handler for Vercel
export default handler;
