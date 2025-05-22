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
      "runtime": "@godsreveal/vercel-bun@0.0.13"
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

### Common Errors

1. **Bootstrap not found**

   Error: `RequestId: xxxxxx Error: Couldn't find valid bootstrap(s): [/var/task/bootstrap /opt/bootstrap]`

   Solution: Make sure you're using version 0.0.12 or later which properly includes the bootstrap file.

2. **Bun binary not found**

   Error: `/var/task/bootstrap: line X: /opt/bun: No such file or directory`

   Solution: Update to version 0.0.13 or later which includes an improved bootstrap script that can find or download the Bun binary.

## How It Works

The runtime provides:

1. A bootstrap script that locates the Bun binary and sets up the environment
2. A runtime handler that processes AWS Lambda events and calls your Bun application
3. Automatic configuration for Vercel's serverless platform

## License

MIT
