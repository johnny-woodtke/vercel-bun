# vercel-bun

Bun runtime for Vercel serverless functions

## Usage

### 1. Configure your `vercel.json` file

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/index.ts": {
      "runtime": "@godsreveal/vercel-bun@0.0.28"
    }
  },
  // Optional: use if you want all /api routes to be handled by /api/index.ts
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.ts" }]
}
```

### 2. Create a Bun serverless function

Create an API endpoint in your project:

```typescript
// api/index.ts
export default function handler(req: Request) {
  return new Response(JSON.stringify({ message: `Hello from bun@${Bun.version}` }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

### 3. Deploy to Vercel

Commit your code and let Vercel's GitHub webhooks deploy your serverless function(s) to the web.

## Features

- Uses Bun runtime (version 1.2.13 by default)
- Supports Bun's native `Request` and `Response` interface
- Works seamlessly with Vercel's serverless infrastructure

## Examples

See the [example](./example) directory for a complete example of using this runtime with a Next.js project.

- `/api`: https://vercel-bun-nine.vercel.app/api
- `/api/hello`: https://vercel-bun-nine.vercel.app/api/hello?firstName=Johnny&lastName=Woodtke

## License

MIT
