# Next.js + Vercel Bun Runtime Example

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) that demonstrates the **vercel-bun** custom runtime for Vercel serverless functions.

## What This Example Demonstrates

This project showcases how to use the [vercel-bun runtime](https://github.com/godsreveal/vercel-bun) to run serverless functions with [Bun](https://bun.sh) instead of Node.js on Vercel. The example includes:

- 🚀 **High-performance serverless functions** powered by Bun
- 🌐 **Comprehensive REST API** built with [Elysia](https://elysiajs.com/)
- 📝 **Full HTTP method support** (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- 🔧 **Advanced features**: Custom headers, cookies, status codes, content types
- 🎯 **Type-safe APIs** with built-in validation using Elysia's type system

## API Endpoints

The `/api` route demonstrates a wide range of serverless function capabilities:

- `GET /api` - Basic hello world with Bun version
- `GET /api/hello?firstName=John&lastName=Doe` - Query parameter handling
- `GET /api/users/:id` - Path parameters and validation
- `GET /api/status/:code` - Custom status codes and headers
- `POST /api/users` - Request body handling
- `PUT /api/users/:id` - Full resource updates
- `PATCH /api/users/:id` - Partial resource updates
- `DELETE /api/users/:id` - Resource deletion
- `HEAD /api/users/:id` - Metadata responses
- `OPTIONS /api/users` - CORS preflight handling
- Content type examples: `/api/content/json`, `/api/content/text`, `/api/content/html`, `/api/content/xml`
- Advanced features: `/api/headers`, `/api/cookies`, `/api/cache`

## Getting Started

First, run the development servers:

```bash
bun run --bun dev:next & bun run --bun dev:api
```

- **Next.js app**: [http://localhost:3001](http://localhost:3001)
- **Elysia API server**: [http://localhost:3000/api](http://localhost:3000/api)

## Testing the API

Try these example requests:

```bash
# Basic greeting
curl http://localhost:3000/api

# Query parameters
curl "http://localhost:3000/api/hello?firstName=John&lastName=Doe"

# Path parameters
curl http://localhost:3000/api/users/123

# POST request
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'

# Custom status codes
curl http://localhost:3000/api/status/201
```

## Deployment on Vercel

This example is configured to deploy with the vercel-bun runtime:

```json
{
  "functions": {
    "api/index.ts": {
      "runtime": "@godsreveal/vercel-bun@0.0.49"
    }
  },
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.ts" }]
}
```

Deploy your GitHub repository to [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). The serverless functions will automatically use Bun instead of Node.js for improved performance.

**Live Demo**: [vercel-bun-nine.vercel.app](https://vercel-bun-nine.vercel.app)

## Learn More

### About This Runtime

- [vercel-bun Documentation](../README.md) - Learn about the custom Bun runtime
- [Bun Runtime](https://bun.sh) - High-performance JavaScript runtime
- [Elysia](https://elysiajs.com) - Fast and type-safe web framework

### Next.js Resources

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial
- [Next.js GitHub repository](https://github.com/vercel/next.js) - Feedback and contributions welcome!

### Vercel Deployment

- [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) - Deployment details
- [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) - Deploy from the creators of Next.js
