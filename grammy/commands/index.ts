import { Bot } from "grammy";

const botToken = Bun.env.BOT_TOKEN;
if (!botToken) {
  throw new Error("BOT_TOKEN is not set");
}

const bot = new Bot(botToken);

bot.command("start", (ctx) => ctx.reply("Hello!"));

export { bot };
