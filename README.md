# Vercel Bun Runtime

A custom runtime for running [Bun](https://bun.sh) applications on Vercel serverless functions.

## Installation

```bash
npm install @godsreveal/vercel-bun
```

## Usage

Create a `vercel.json` file in your project root:

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@godsreveal/vercel-bun@0.0.11"
    }
  }
}
```

## Supported Features

- Run Bun serverless functions on Vercel
- Support for API routes with Elysia or other Bun-compatible frameworks
- Automatic handling of HTTP requests

## Example

Create an API route in your project:

```typescript
// api/hello.ts
import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" }).get(
  "/hello",
  () => `Hello from bun@${Bun.version}`,
  {
    response: t.String(),
  }
);

export const GET = app.handle;
export const POST = app.handle;
```

## Troubleshooting

If you encounter the error `RequestId: xxxxxx Error: Couldn't find valid bootstrap(s): [/var/task/bootstrap /opt/bootstrap]`, make sure you're using the latest version of the runtime.

## License

MIT
