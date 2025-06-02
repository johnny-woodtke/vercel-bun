# vercel-bun

Bun runtime for Vercel serverless functions

## Overview

vercel-bun is a custom Vercel runtime that enables you to run serverless functions using the [Bun](https://bun.sh) JavaScript runtime instead of Node.js. This runtime provides improved performance, better TypeScript support, and access to Bun's native APIs.

## Features

- 🚀 **High Performance**: Uses Bun's fast JavaScript runtime (version 1.2.13 by default)
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
      "runtime": "@godsreveal/vercel-bun@0.1.0"
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
| `BUN_VERSION` | Specify the Bun version to use | `1.2.13` | `1.2.13` |

## Examples

See the [example](./example) directory for a complete example of using this runtime with a Next.js project.

**[Live Bun Redis/S3 Client Demo](https://vercel-bun-nine.vercel.app)**

## Next Steps

- [ ] **E2E Tests**: E2E tests for the [example](./example) project.
    - Query the production deployment.
    - Use built-in bun testing tools.
    - Use Eden to ensure type safety.
    - Test all methods (GET, POST, PATCH...), status codes, CDN caching, body, dynamic path, query params, headers, cookies, and content types.
    - Test Redis and S3 integrations.
    - Ensure these are runnable in GitHub Actions.
- [ ] **Performance Benchmarks**: Create performance comparisons between Bun and Node.js runtimes.
    - [bench](./bench) directory with two functions: `/api/bun.ts` and `/api/node.ts`. Both functions should perform the same operations.
    - Write a script to query the production API routes.
    - Query Vercel logs to compile perf metrics (removes "over-the-wire" time).
    - Record warmed-up metrics (and cold-start metrics, if possible)
    - Ensure script is runnable in GitHub Actions.
- [ ] **Framework Examples**: Add more framework examples (Hono, Fastify, etc.).

## Goals

- [ ] **First-class Vercel Integration**: Native Bun runtime support in Vercel's platform for both serverless and edge functions.
- [ ] **Next.js Integration**: Runtime specification in `next.config.js` for API routes and React Server Components.
