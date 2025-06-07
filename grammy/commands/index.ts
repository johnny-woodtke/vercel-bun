import { Bot } from "grammy";

// Get bot token from environment variables
const botToken = Bun.env.BOT_TOKEN;
if (!botToken) {
  throw new Error("BOT_TOKEN is not set");
}

// Create bot instance
const bot = new Bot(botToken);

// Add command handlers
bot.command("start", (ctx) => ctx.reply("Hello!"));
bot.command("help", (ctx) => ctx.reply("Help!"));
bot.command("about", (ctx) => ctx.reply("About!"));
bot.command("contact", (ctx) => ctx.reply("Contact!"));
bot.command("donate", (ctx) => ctx.reply("Donate!"));
bot.command("subscribe", (ctx) => ctx.reply("Subscribe!"));
bot.command("unsubscribe", (ctx, next) => ctx.reply("Unsubscribe!"));

// Export bot instance
export { bot };
