# Bun Runtime for Vercel

This package provides Bun runtime support for Vercel serverless functions.

## Usage

To use Bun for your Vercel functions, you need to specify this runtime in your `vercel.json` file:

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/bun@1.0.0"
    }
  }
}
```

## Features

- Supports Bun 1.2.13 on Linux/aarch64 architecture
- Handles TypeScript and JavaScript files automatically
- Compatible with AWS Lambda provided.al2 runtime
- Optimized caching for faster redeployments
- Large environment variable support via Lambda runtime wrappers

## Limitations

- Currently `vercel dev` is not supported for local development
- Only supports aarch64 architecture (ARM64)
- Custom binary installations are not yet supported

## Example Function

Create a file at `api/hello.ts`:

```typescript
export default function handler(request) {
  return new Response(
    JSON.stringify({
      message: `Hello from Bun ${Bun.version}!`,
      time: new Date().toISOString(),
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
```

## How It Works

This runtime:

1. Downloads the Bun binary during the build process
2. Sets up the Lambda environment with the Bun runtime
3. Creates a bootstrap script that starts the Bun runtime
4. Implements the AWS Lambda Runtime API for handling requests

## License

MIT
