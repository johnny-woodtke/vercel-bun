# vercel-bun

Bun runtime for Vercel serverless functions

## Overview

`@godsreveal/vercel-bun` is a custom Vercel runtime that enables you to run serverless functions using the [Bun](https://bun.sh) JavaScript runtime instead of Node.js. This runtime provides improved performance, better TypeScript support, and access to Bun's native APIs.

## Features

- 🚀 **High Performance**: Uses Bun's fast JavaScript runtime (version 1.2.13 by default)
- 📦 **Native TypeScript**: Built-in TypeScript support without additional compilation
- 🌐 **Web Standard APIs**: Uses native `Request` and `Response` interfaces
- ⚡ **Fast Cold Starts**: Optimized bootstrap process for minimal latency
- 🏗️ **Framework Agnostic**: Works with any framework that supports Bun (Elysia, Hono, etc.)
- 🔧 **Configurable**: Customizable Bun version and architecture support

## Usage

### 1. Configure your `vercel.json` file

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/index.ts": {
      "runtime": "@godsreveal/vercel-bun@0.0.35"
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

### 3. Configure and Deploy to Vercel

Deploy your GitHub repository to [Vercel](https://vercel.com/docs/git#deploying-a-git-repository).

## Configuration

### Environment Variables

| Variable      | Description                    | Default  | Example  |
| ------------- | ------------------------------ | -------- | -------- |
| `BUN_VERSION` | Specify the Bun version to use | `1.2.13` | `1.2.13` |

### Runtime Architecture

The runtime automatically detects and downloads the appropriate Bun binary:

- **x64**: Default for Vercel's AWS Lambda environment
- **aarch64**: Used when `process.arch === "arm64"`

## Handler Interface

Your function must export a default handler that matches this interface:

```typescript
type Handler = (req: Request) => Promise<Response>;
```

### Request Object

The `Request` object follows the Web API standard and includes:

- `req.method`: HTTP method (GET, POST, etc.)
- `req.url`: Full URL including query parameters
- `req.headers`: Request headers
- `req.body`: Request body (use `req.json()`, `req.text()`, etc.)

### Response Object

Return a standard `Response` object:

- `new Response(body, { status, headers })`
- Use `Response.json(data)` for JSON responses
- Use `Response.redirect(url)` for redirects

## Runtime Internals

### Build Process

1. **Binary Download**: Downloads the appropriate Bun binary for the target architecture
2. **Runtime Packaging**: Includes runtime files for request/response handling
3. **Lambda Creation**: Packages everything into a Vercel Lambda function

### Request Flow

1. **AWS Lambda Runtime** receives the request
2. **Bootstrap Script** initializes Bun with optimized settings
3. **Runtime Handler** processes the Vercel request payload
4. **User Function** receives a standard `Request` object
5. **Response Transform** converts the `Response` back to Vercel format

### Performance Optimizations

- **Binary Caching**: Bun binary is cached during build
- **Handler Caching**: User handlers are cached after first load
- **Optimized Bootstrap**: Minimal initialization for fast cold starts
- **Disabled Analytics**: Bun analytics and update checks are disabled

## Troubleshooting

### Common Issues

1. **Handler not found**: Ensure your function exports a default function

   ```typescript
   // ❌ Wrong
   export const handler = (req: Request) => { ... };

   // ✅ Correct
   export default function handler(req: Request) { ... };
   ```

2. **Import errors**: Make sure all dependencies are installed and TypeScript paths are correct

3. **Cold start timeout**: Keep your handler initialization lightweight

### Version Compatibility

- **Bun Version**: 1.2.13+ (configurable via `BUN_VERSION`)
- **Node.js APIs**: Most Node.js APIs are supported through Bun's compatibility layer
- **TypeScript**: Full TypeScript support without additional setup

## Examples

See the [example](./example) directory for a complete example of using this runtime with a Next.js project.

**Live Demo:**

- `/api`: https://vercel-bun-nine.vercel.app/api
- `/api/hello`: https://vercel-bun-nine.vercel.app/api/hello?firstName=Johnny&lastName=Woodtke
