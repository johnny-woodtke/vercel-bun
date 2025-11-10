# vercel-bun

Bun runtime for Vercel serverless functions

## Important

**Bun is now an officially supported runtime on Vercel**, so I do NOT recommend using this custom Bun runtime unless:
1. You have critical, unsolvable issues with the official runtime
2. You want to run your serverless functions with a specific version of Bun

Please reference the Vercel documentation here for more information: https://vercel.com/docs/functions/runtimes/bun

## Overview

vercel-bun is a custom Vercel runtime that enables you to run serverless functions using the [Bun](https://bun.sh) JavaScript runtime instead of Node.js. This runtime provides improved performance, better TypeScript support, and access to Bun's native APIs.

## Features

- 🚀 **High Performance**: Uses Bun's fast JavaScript runtime (version 1.2.15 by default)
- 📦 **Native TypeScript**: Built-in TypeScript support without additional compilation
- 🌐 **Web Standard APIs**: Uses native `Request` and `Response` interfaces
- 🏗️ **Framework Agnostic**: Works with any framework that supports Bun (Elysia, Hono, etc.)
- 🔧 **Configurable**: Customizable Bun version

## Usage

### 1. Configure your `vercel.json` file

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/index.ts": {
      "runtime": "@godsreveal/vercel-bun@0.2.6"
    }
  },
  // Optional: use if you want all /api routes to be handled by /api/index.ts
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.ts" }]
}
```

### 2. Create a Bun serverless function

#### Basic Handler (Vanilla)

```typescript
// api/index.ts
export default function handler(req: Request) {
  return new Response(
    JSON.stringify({ message: `Hello from bun@${Bun.version}` }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

#### Advanced Handler (with Elysia)

```typescript
// api/index.ts
import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" })
  .get("/", () => `Hello from bun@${Bun.version}`)
  .get("/hello", ({ query }) => `Hello ${query.firstName} ${query.lastName}`, {
    query: t.Object({
      firstName: t.String(),
      lastName: t.String(),
    }),
  })
  .post(
    "/users",
    async ({ body }) => {
      // Your logic here
      return { success: true, data: body };
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
      }),
    }
  );

// Development server (runs locally with `bun run api/index.ts`)
if (process.env.NODE_ENV !== "production") {
  app.listen({ port: 3000 });
  console.log("Server is running on http://localhost:3000");
}

export default app.handle;
```

### 3. Deploy to Vercel

Deploy your GitHub repository to [Vercel](https://vercel.com/docs/git#deploying-a-git-repository).

## Configuration

### Environment Variables

| Variable      | Description                    | Default  | Example  |
| ------------- | ------------------------------ | -------- | -------- |
| `BUN_VERSION` | Specify the Bun version to use | `1.2.15` | `1.2.15` |

## Examples

See the [examples](./examples) directory for several examples:

- **[Vanilla](https://vercel-bun-bench.vercel.app)** - A comprehensive benchmarking suite comparing Bun and Node.js runtime performance on Vercel serverless functions, including cold start, throughput, concurrency, and payload size tests.

- **[Next.js + ElysiaJS](https://vercel-bun-nine.vercel.app)** - A full-stack Next.js application demonstrating high-performance serverless functions with Elysia REST API, Redis integration, Cloudflare R2 image uploads, and end-to-end type safety using Eden Treaty.

- **[Next.js + Hono](https://vercel-bun-hono.vercel.app)** - A lightweight and fast Next.js application showcasing serverless functions with the Hono web framework, featuring type-safe request validation with Zod and optimized performance for edge computing.

- **[grammY](https://vercel-bun-grammy.vercel.app)** - A Telegram bot built with the grammY framework, showcasing how to deploy chatbots as serverless functions using the Bun runtime with webhook support and modular command structure.

## Goals

- [ ] **First-class Vercel Integration**: Native Bun runtime support in Vercel's platform for both serverless and edge functions.
- [ ] **Next.js Integration**: Runtime specification in `next.config.js` for API routes and React Server Components.
