const botToken = Bun.env.BOT_TOKEN;
if (!botToken) {
  throw new Error("BOT_TOKEN is not set");
}

const webhookUrl = Bun.argv[2];
if (!webhookUrl) {
  throw new Error("Webhook URL was not provided");
}

console.log(`Setting webhook URL to ${webhookUrl}...\n`);

const response = await fetch(
  `https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`
);

console.log(await response.json(), "\n");
