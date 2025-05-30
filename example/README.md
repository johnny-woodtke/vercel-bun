# Next.js + Vercel Bun Runtime Example

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) that demonstrates the **vercel-bun** custom runtime for Vercel serverless functions.

## What This Example Demonstrates

This project showcases how to use the [vercel-bun runtime](https://github.com/godsreveal/vercel-bun) to run serverless functions with [Bun](https://bun.sh) instead of Node.js on Vercel. The example includes:

- 🚀 **High-performance serverless functions** powered by Bun
- 🌐 **Comprehensive REST API** built with [Elysia](https://elysiajs.com/)
- 📝 **Full HTTP method support** (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- 🔧 **Advanced features**: Custom headers, cookies, status codes, content types
- 🎯 **Type-safe APIs** with built-in validation using Elysia's type system
- 🔒 **Redis integration** with Bun's native Redis client and session-based data storage
- 🔗 **End-to-end type safety** using `@elysiajs/eden` for seamless client-server communication
- ⚡ **Real-time UI updates** with `@tanstack/react-query` for efficient data fetching and caching

## Live Demo Features

### 📊 Interactive Redis Demo

The example includes a fully functional Redis demo that showcases:

- **Session-scoped text entries** - Each user session can store and manage text entries
- **Auto-expiring data** - Entries automatically expire after 2 minutes (TTL: 120 seconds)
- **Real-time updates** - UI updates every 5 seconds showing live entry counts and session info
- **Session management** - Users can switch between sessions or create new ones
- **CRUD operations** - Add, view, and delete entries with instant feedback

### 🔗 Type-Safe API Communication

- **Eden client** for end-to-end TypeScript safety between frontend and backend
- **Automatic type inference** from Elysia route definitions to React components
- **Compile-time error checking** for API calls and response handling

### ⚡ Optimized Data Management

- **React Query integration** for intelligent caching and background refetching
- **Optimistic updates** with automatic rollback on errors
- **Query invalidation** strategies for consistent data synchronization

## API Endpoints

The `/api` route demonstrates a wide range of serverless function capabilities:

### Core Endpoints

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

### Redis Demo Endpoints

- `POST /api/redis/entries` - Add a new entry to the current session
- `GET /api/redis/entries` - Retrieve all entries for the current session
- `DELETE /api/redis/entries/:id` - Delete a specific entry

### Content Type Examples

- `/api/content/json`, `/api/content/text`, `/api/content/html`, `/api/content/xml`

### Advanced Features

- `/api/headers`, `/api/cookies`, `/api/cache`

## Getting Started

Run the development servers:

```bash
bun run --bun dev:next & bun run --bun dev:api
```

- **Next.js app**: [http://localhost:3001](http://localhost:3001)
- **Elysia API server**: [http://localhost:3000/api](http://localhost:3000/api)

## Environment Setup

To run the Redis demo, you'll need a Redis instance. Add your Redis connection URL to your environment:

```bash
# .env.local
REDIS_URL=redis://localhost:6379
# or for Redis Cloud/remote instances:
# REDIS_URL=redis://username:password@host:port
```

For local development, you can start a Redis server with:

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using Bun (if you have Redis installed locally)
redis-server
```

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

# Redis demo - Add entry
curl -X POST http://localhost:3000/api/redis/entries \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello Redis with Bun!"}'

# Redis demo - Get entries
curl http://localhost:3000/api/redis/entries
```

## Deployment on Vercel

This example is configured to deploy with the vercel-bun runtime:

```json
{
  "functions": {
    "api/index.ts": {
      "runtime": "@godsreveal/vercel-bun@0.0.50"
    }
  },
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.ts" }]
}
```

### Redis on Vercel

For production deployment, you'll need to configure a Redis instance. Recommended options:

- **[Vercel Redis](https://vercel.com/marketplace/redis)** - Vercel's Redis integration
- **[Upstash Redis](https://upstash.com/)** - Serverless Redis with REST API

Add your `REDIS_URL` environment variable in your Vercel project settings.

Deploy your GitHub repository to [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). The serverless functions will automatically use Bun instead of Node.js for improved performance.

**Live Demo**: [vercel-bun-nine.vercel.app](https://vercel-bun-nine.vercel.app)

## Architecture Highlights

### Frontend Architecture

- **React 19** with Next.js 15 for modern React features
- **TanStack Query** for intelligent server state management
- **Eden Treaty** for type-safe API communication
- **Tailwind CSS** for utility-first styling
- **Radix UI** components for accessible UI primitives

### Backend Architecture

- **Elysia.js** framework for high-performance APIs
- **Bun's native Redis client** for direct Redis communication
- **Session-based storage** with automatic cleanup
- **Type validation** with Elysia's built-in schema system
- **CORS support** for cross-origin requests

### Type Safety Flow

```
1. Elysia route definitions → 2. Eden client generation → 3. React Query hooks → 4. UI components
```

This creates a fully type-safe data flow from API endpoints to UI components with automatic TypeScript inference.

## Learn More

### About This Runtime

- [vercel-bun Documentation](../README.md) - Learn about the custom Bun runtime
- [Bun Runtime](https://bun.sh) - High-performance JavaScript runtime
- [Bun Redis Client](https://bun.sh/docs/api/redis) - Native Redis support in Bun

### Framework Documentation

- [Elysia](https://elysiajs.com) - Fast and type-safe web framework
- [Eden Treaty](https://elysiajs.com/eden/overview.html) - End-to-end type safety
- [TanStack Query](https://tanstack.com/query) - Powerful data synchronization

### Next.js Resources

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial
- [Next.js GitHub repository](https://github.com/vercel/next.js) - Feedback and contributions welcome!

### Vercel Deployment

- [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) - Deployment details
- [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) - Deploy from the creators of Next.js
