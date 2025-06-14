# Next.js + Hono — Vercel Bun Runtime Example

This is a [Next.js](https://nextjs.org) project that demonstrates the **vercel-bun** custom runtime for Vercel serverless functions using the [Hono](https://hono.dev) web framework.

## What This Example Demonstrates

This project showcases how to use the [vercel-bun runtime](https://github.com/godsreveal/vercel-bun) to run serverless functions with [Bun](https://bun.sh) and [Hono](https://hono.dev) instead of Node.js on Vercel. The example includes:

- 🚀 **High-performance serverless functions** powered by Bun
- 🌐 **Lightweight and fast API** built with [Hono](https://hono.dev/)
- 📝 **Type-safe request/response handling** with Zod validation
- 🔧 **Modern development setup** with TypeScript and Next.js 15
- ⚡ **Optimized for serverless** with efficient cold start times

## Features

- **Hono Framework**: Fast, lightweight web framework built for edge computing
- **Zod Validation**: Type-safe request validation with `@hono/zod-validator`
- **TypeScript Support**: Full TypeScript integration with type checking
- **Next.js Frontend**: Modern React frontend with Tailwind CSS
- **Development Mode**: Local development server with hot reload
- **Serverless Deployment**: Optimized for Vercel with custom Bun runtime

## Project Structure

```
hono/
├── api/
│   └── index.ts        # Main API handler for Vercel
├── routes/
│   └── index.ts        # Hono routes and handlers
├── app/
│   ├── layout.tsx      # Next.js root layout
│   ├── page.tsx        # Homepage component
│   └── globals.css     # Global styles
├── public/             # Static assets
├── package.json        # Dependencies and scripts
├── next.config.ts      # Next.js configuration
├── tsconfig.json       # TypeScript configuration
├── vercel.json         # Vercel deployment config
└── README.md           # This file
```

## API Endpoints

The example includes a simple REST API built with Hono:

### Root Endpoints

| Method | Endpoint     | Description                     | Response                         |
| ------ | ------------ | ------------------------------- | -------------------------------- |
| `GET`  | `/api`       | Basic greeting with Bun version | `"Hello from bun@{version}"`     |
| `GET`  | `/api/hello` | Personalized greeting           | `"Hello {firstName} {lastName}"` |

**Query Parameters for `/api/hello`:**

- `firstName` (string, required) - First name for greeting
- `lastName` (string, required) - Last name for greeting

### Example Requests

```bash
# Basic greeting
curl https://vercel-bun-hono.vercel.app/api

# Personalized greeting
curl "https://vercel-bun-hono.vercel.app/api/hello?firstName=John&lastName=Doe"
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine
- Node.js (for Next.js development)

### Installation

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Start the development servers**:

   ```bash
   # Start both Next.js and API servers
   bun run dev:next & bun run dev:api
   ```

   Or run them separately:

   ```bash
   # Start Next.js development server (port 3001)
   bun run dev:next

   # Start API development server (port 3000)
   bun run dev:api
   ```

3. **Open your browser**:
   - **Next.js app**: [http://localhost:3001](http://localhost:3001)
   - **API server**: [http://localhost:3000/api](http://localhost:3000/api)

### Available Scripts

- `bun run dev:next` - Start Next.js development server on port 3001
- `bun run dev:api` - Start Hono API server on port 3000 with auto-reload
- `bun run build` - Build the Next.js application for production
- `bun run start` - Start the production Next.js server
- `bun run check-types` - Run TypeScript type checking
- `bun run lint` - Run ESLint for code quality

## Development

### Local Development

The project is set up for efficient local development:

1. **API Development**: The API server runs on port 3000 with Bun's built-in file watching for instant reload
2. **Frontend Development**: Next.js runs on port 3001 with hot module replacement
3. **Type Safety**: Shared types between frontend and backend with TypeScript
4. **Validation**: Request validation using Zod schemas

### Adding New API Routes

To add new routes, edit `routes/index.ts`:

```typescript
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

export const app = new Hono()
  .basePath("/api")

  // Existing routes...

  // Add new routes here
  .post(
    "/users",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        email: z.string().email(),
      })
    ),
    (c) => {
      const { name, email } = c.req.valid("json");
      return c.json({ message: `User ${name} created with email ${email}` });
    }
  );
```

### Environment Variables

For local development, create a `.env.local` file:

```bash
# Optional: Custom API port
NEXT_PUBLIC_API_PORT=3000

# Add other environment variables as needed
```

## Testing the API

Test the API endpoints using curl or your preferred HTTP client:

```bash
# Test basic endpoint
curl http://localhost:3000/api

# Test with query parameters
curl "http://localhost:3000/api/hello?firstName=Jane&lastName=Smith"

# Test with missing parameters (should return validation error)
curl "http://localhost:3000/api/hello?firstName=Jane"
```

## Deployment

This example is configured to deploy to [Vercel](https://vercel.com/) with the vercel-bun runtime.

### Vercel Configuration

The `vercel.json` file configures the deployment:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/index.ts": {
      "runtime": "@godsreveal/vercel-bun@0.2.3"
    }
  },
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.ts" }]
}
```

### Deployment Steps

1. **Connect to Vercel**: Import your GitHub repository to Vercel
2. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `bun run build`
   - Install Command: `bun install`
3. **Deploy**: Vercel will automatically deploy your application

The serverless functions will run with Bun instead of Node.js, providing better performance and faster cold starts.

## Architecture

### Runtime Architecture

- **Frontend**: Next.js 15 with React 19 and Tailwind CSS
- **Backend**: Hono framework running on Bun runtime
- **Validation**: Zod schemas for type-safe request validation
- **Deployment**: Vercel serverless functions with custom Bun runtime

### Request Flow

1. **Client Request** → Frontend (Next.js on port 3001)
2. **API Call** → Backend (Hono on port 3000 locally, serverless on Vercel)
3. **Validation** → Zod schema validation for request parameters
4. **Response** → Type-safe JSON response back to client

## Learn More

### Framework Documentation

- [Hono Documentation](https://hono.dev/) - Fast, lightweight web framework
- [Hono Zod Validator](https://hono.dev/middleware/third-party/zod-validator) - Type-safe validation
- [Next.js Documentation](https://nextjs.org/docs) - React framework features

### Runtime & Deployment

- [vercel-bun Documentation](../../README.md) - Custom Bun runtime for Vercel
- [Bun Runtime](https://bun.sh) - High-performance JavaScript runtime
- [Vercel Deployment](https://vercel.com/docs/deployments) - Serverless deployment platform

### Getting Help

- [Hono Discord](https://discord.gg/hono) - Community support for Hono
- [Next.js GitHub](https://github.com/vercel/next.js) - Issues and discussions
- [Vercel Community](https://github.com/vercel/community) - Platform support

Deploy your project to [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) and experience the performance benefits of running Hono with Bun on serverless functions.
