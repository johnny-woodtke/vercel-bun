import { webhookCallback } from "grammy";

import { bot } from "@/commands";

export default webhookCallback(bot, "std/http");
