# grammY – Vercel Bun Runtime Example

A Telegram bot built with the [grammY framework](https://grammy.dev/) and deployed to Vercel using the Bun runtime.

## 🚀 Features

- Built with [grammY](https://grammy.dev/) - The modern Telegram Bot Framework
- Runs on [Bun](https://bun.sh/) for fast performance
- Deployed as Vercel Serverless Functions
- TypeScript support with type checking
- Modular command structure
- Local development with ngrok for webhook testing

## 🤖 Try the Bot

You can try out a live demo of this bot on Telegram: [@BunVercelBot](https://t.me/BunVercelBot)

## 📁 Project Structure

```
grammy/
├── api/
│   └── bot.ts          # Main bot handler for Vercel
├── commands/
│   └── index.ts        # Bot commands and logic
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vercel.json         # Vercel deployment config
└── .gitignore          # Git ignore rules
```

## 🛠 Local Development

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine
- [ngrok](https://ngrok.com/) for webhook tunneling
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Setup Steps

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Install ngrok** (if not already installed)

   ```bash
   # macOS
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

3. **Create environment file**

   ```bash
   cp .env
   ```

   Add your bot token to `.env`:

   ```env
   BOT_TOKEN=your_bot_token_here
   API_PORT=3000
   ```

4. **Start the development server**

   ```bash
   bun dev
   ```

   This starts the bot server on `http://localhost:3000` (or your configured `API_PORT`).

5. **Serve the development server publicly**

   ```bash
   bun dev:serve
   ```

   This uses ngrok to create a public tunnel to your local server.

6. **Set the webhook**

   After running `bun dev:serve`, ngrok will provide a public URL (e.g., `https://abc123.ngrok.io`). Set your bot's webhook:

   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<NGROK_URL>/api/bot"
   ```

   Replace:

   - `<BOT_TOKEN>` with your actual bot token
   - `<NGROK_URL>` with the ngrok URL (without trailing slash)

### Available Commands

The bot currently supports these commands:

- `/start` - Welcome message
- `/help` - Help information
- `/about` - About the bot
- `/contact` - Contact information
- `/donate` - Donation information
- `/subscribe` - Subscribe to updates
- `/unsubscribe` - Unsubscribe from updates

## 🚀 Deployment

This bot is configured to deploy to [Vercel](https://vercel.com/) as serverless functions.

### Deployment Steps

1. **Connect your repository to Vercel**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository

2. **Configure build settings**

   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `bun install`

3. **Set environment variables**

   In your Vercel project settings, add:

   ```
   BOT_TOKEN=your_bot_token_here
   ```

4. **Deploy**

   Vercel will automatically deploy your bot. After deployment, set the webhook:

   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/api/bot"
   ```

### Vercel Configuration

The project includes a `vercel.json` configuration file that uses the Bun runtime:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/bot.ts": {
      "runtime": "@godsreveal/vercel-bun@0.2.3"
    }
  }
}
```

This configuration uses a custom Bun runtime for Vercel, allowing the bot to run with Bun's performance benefits in the serverless environment.

## 🔧 Development Scripts

- `bun dev` - Start the development server with auto-reload
- `bun dev:serve` - Expose local server via ngrok
- `bun check-types` - Run TypeScript type checking

## 📚 Documentation

- [grammY Documentation](https://grammy.dev/) - Main framework documentation
- [Vercel Deployment Guide](https://grammy.dev/hosting/vercel) - Specific guide for Vercel deployment
- [Telegram Bot API](https://core.telegram.org/bots/api) - Official Telegram Bot API reference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run type checking: `bun check-types`
5. Test locally with `bun dev`
6. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Troubleshooting

### Common Issues

**Bot not responding to commands:**

- Check that the webhook is set correctly
- Verify your `BOT_TOKEN` is correct
- Ensure the bot is not running in polling mode elsewhere

**Local development issues:**

- Make sure ngrok is installed and accessible
- Check that the `.env` file contains the correct `BOT_TOKEN`
- Verify the webhook URL includes the correct path (`/api/bot`)

**Deployment issues:**

- Ensure environment variables are set in Vercel
- Check that the webhook URL matches your Vercel deployment URL
- Review Vercel function logs for errors

For more help, refer to the [grammY documentation](https://grammy.dev/) or check the [Vercel deployment guide](https://grammy.dev/hosting/vercel).
