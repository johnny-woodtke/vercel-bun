# Next.js + ElysiaJS — Vercel Bun Runtime Example

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) that demonstrates the **vercel-bun** custom runtime for Vercel serverless functions.

## What This Example Demonstrates

This project showcases how to use the [vercel-bun runtime](https://github.com/godsreveal/vercel-bun) to run serverless functions with [Bun](https://bun.sh) instead of Node.js on Vercel. The example includes:

- 🚀 **High-performance serverless functions** powered by Bun
- 🌐 **Comprehensive REST API** built with [Elysia](https://elysiajs.com/)
- 📝 **Full HTTP method support** (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- 🔧 **Advanced features**: Custom headers, cookies, status codes, content types
- 🎯 **Type-safe APIs** with built-in validation using Elysia's type system
- 🔒 **Redis integration** with Bun's native Redis client and session-based data storage
- 📸 **Image upload to Cloudflare R2** using Bun's native S3 client with automatic file management
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

### 📸 Image Upload Demo

A complete image upload system demonstrating:

- **Drag & drop file upload** with visual feedback and progress indicators
- **Cloudflare R2 storage** using Bun's native S3-compatible client
- **Automatic file management** with unique naming and metadata storage
- **Image preview and gallery** with real-time updates
- **File validation** with size limits and type checking
- **Optimistic UI updates** with error handling and rollback

### 🔗 Type-Safe API Communication

- **Eden client** for end-to-end TypeScript safety between frontend and backend
- **Automatic type inference** from Elysia route definitions to React components
- **Compile-time error checking** for API calls and response handling

### ⚡ Optimized Data Management

- **React Query integration** for intelligent caching and background refetching
- **Optimistic updates** with automatic rollback on errors
- **Query invalidation** strategies for consistent data synchronization

## API Endpoints

The example includes a comprehensive REST API built with [Elysia](https://elysiajs.com/) demonstrating various features:

### Root Endpoints

| Method | Endpoint     | Description                     | Response                         |
| ------ | ------------ | ------------------------------- | -------------------------------- |
| `GET`  | `/api`       | Basic greeting with Bun version | `"Hello from bun@{version}"`     |
| `GET`  | `/api/hello` | Personalized greeting           | `"Hello {firstName} {lastName}"` |

**Query Parameters for `/api/hello`:**

- `firstName` (string, required)
- `lastName` (string, required)

### Base Routes (`/api/base/*`)

Comprehensive examples showcasing HTTP fundamentals:

#### Content Types (`/api/base/content/*`)

| Method | Endpoint                 | Content-Type       | Description           |
| ------ | ------------------------ | ------------------ | --------------------- |
| `GET`  | `/api/base/content/json` | `application/json` | JSON response example |
| `GET`  | `/api/base/content/text` | `text/plain`       | Plain text response   |
| `GET`  | `/api/base/content/html` | `text/html`        | HTML response         |
| `GET`  | `/api/base/content/xml`  | `application/xml`  | XML response          |

#### HTTP Methods (`/api/base/methods/*`)

| Method    | Endpoint                    | Description             |
| --------- | --------------------------- | ----------------------- |
| `GET`     | `/api/base/methods/get`     | GET request example     |
| `POST`    | `/api/base/methods/post`    | POST request example    |
| `PATCH`   | `/api/base/methods/patch`   | PATCH request example   |
| `PUT`     | `/api/base/methods/put`     | PUT request example     |
| `DELETE`  | `/api/base/methods/delete`  | DELETE request example  |
| `OPTIONS` | `/api/base/methods/options` | OPTIONS request example |
| `HEAD`    | `/api/base/methods/head`    | HEAD request example    |

#### Parameters (`/api/base/params/*`)

| Method | Endpoint                    | Description                | Body Schema               |
| ------ | --------------------------- | -------------------------- | ------------------------- |
| `POST` | `/api/base/params/body`     | Request body validation    | `{ name: string }`        |
| `POST` | `/api/base/params/query`    | Query parameter validation | Query: `{ name: string }` |
| `POST` | `/api/base/params/path/:id` | Path parameter validation  | Path: `{ id: string }`    |

#### Custom Headers & Cookies (`/api/base/headers/*`)

| Method | Endpoint                          | Description            | Headers Set                         |
| ------ | --------------------------------- | ---------------------- | ----------------------------------- |
| `GET`  | `/api/base/headers/cache-control` | Cache control header   | `cache-control: public, max-age=60` |
| `GET`  | `/api/base/headers/custom`        | Custom header example  | `x-custom-header: test`             |
| `GET`  | `/api/base/headers/cookie`        | Set cookie example     | Sets `x-elysia-cookie`              |
| `POST` | `/api/base/headers/cookie`        | Receive cookie example | Expects `x-test-cookie`             |

#### Status Codes (`/api/base/status/*`)

| Method | Endpoint               | Status Code | Description           |
| ------ | ---------------------- | ----------- | --------------------- |
| `POST` | `/api/base/status/200` | 200         | OK response           |
| `POST` | `/api/base/status/400` | 400         | Bad Request           |
| `POST` | `/api/base/status/404` | 404         | Not Found             |
| `POST` | `/api/base/status/405` | 405         | Method Not Allowed    |
| `POST` | `/api/base/status/429` | 429         | Too Many Requests     |
| `POST` | `/api/base/status/500` | 500         | Internal Server Error |

### Redis Routes (`/api/redis/*`)

Session-based data storage with automatic expiration:

#### Entries Management

| Method   | Endpoint                      | Description                   | Authentication                         |
| -------- | ----------------------------- | ----------------------------- | -------------------------------------- |
| `POST`   | `/api/redis/entries`          | Create new entry (text/image) | Requires `memberId` cookie             |
| `GET`    | `/api/redis/entries`          | Get all entries for session   | Requires `memberId` cookie             |
| `DELETE` | `/api/redis/entries/:entryId` | Delete specific entry         | Requires `memberId` cookie + ownership |

**Required Parameters:**

- **Cookie**: `memberId` (string) - Session member identifier
- **Query**: `sessionId` (string) - Session identifier

**POST `/api/redis/entries` Body Schema:**

```typescript
{
  text?: string;        // Max 1000 characters
  ttl: number | string; // 10-300 seconds
  image?: File;         // Max 5MB, jpg/jpeg/png/gif/webp
}
```

**Entry Response Schema:**

```typescript
{
  id: string;
  text?: string;
  imageUrl?: string;
  ttl: number;
  memberId: string;
  createdAt: string;
}
```

**GET `/api/redis/entries` Response:**

```typescript
{
  data: Entry[];
  onlineCount: number;  // Active members in session
}
```

#### Features:

- **Session-scoped data**: Each session maintains separate entries
- **Auto-expiring entries**: TTL-based cleanup (10-300 seconds)
- **Image upload**: Direct upload to Cloudflare R2 with public URLs
- **Online member tracking**: Real-time count of active session members
- **Ownership validation**: Members can only delete their own entries
- **File validation**: Size limits, type checking, and metadata storage

## E2E Tests

Comprehensive end-to-end testing suite using Bun's built-in test runner covering all API functionality:

### Test Structure

The E2E tests are organized into three main suites:

#### 1. Base Route Tests (`base.test.ts`)

**Coverage**: HTTP fundamentals and Elysia framework features

- **Content Type Tests** (`/api/base/content/*`)

  - JSON response formatting and headers
  - Plain text response handling
  - HTML content type validation
  - XML response structure and headers

- **HTTP Method Tests** (`/api/base/methods/*`)

  - All HTTP methods: GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD
  - Response validation for each method
  - Proper status code handling

- **Parameter Validation Tests** (`/api/base/params/*`)

  - Request body validation with type checking
  - Query parameter processing and validation
  - Path parameter extraction and validation
  - Error handling for invalid parameters (422 status codes)

- **Headers & Cookies Tests** (`/api/base/headers/*`)

  - Cache-control header setting and validation
  - Custom header management
  - Cookie setting with security attributes
  - Cookie reception and validation
  - Proper error handling for missing cookies

- **Status Code Tests** (`/api/base/status/*`)
  - Custom status code responses (200, 400, 404, 405, 429, 500)
  - Proper error message formatting

#### 2. Redis Integration Tests (`redis.test.ts`)

**Coverage**: Session-based storage, TTL management, and online tracking

- **Entry Creation Tests** (`POST /api/redis/entries`)

  - Text entry creation with TTL validation
  - Image upload with file validation
  - TTL conversion from string to number
  - Validation that either text or image is required
  - Text length limits (max 1000 characters)
  - TTL range validation (10-300 seconds)
  - Member ID cookie requirement

- **Entry Retrieval Tests** (`GET /api/redis/entries`)

  - Session-scoped entry listing
  - Online member count tracking
  - Proper data structure validation
  - Authentication requirements

- **Entry Deletion Tests** (`DELETE /api/redis/entries/:entryId`)

  - Ownership validation (members can only delete own entries)
  - Entry existence validation (404 for missing entries)
  - Proper authorization (403 for non-owners)
  - Successful deletion confirmation

- **Session Management**
  - Automatic member tracking and online status
  - Session isolation (entries don't leak between sessions)
  - TTL-based automatic cleanup validation

#### 3. S3/R2 Storage Tests (`s3.test.ts`)

**Coverage**: Cloudflare R2 integration and file upload functionality

- **Image Upload Tests**

  - Successful upload with public URL generation
  - File accessibility validation via HTTP requests
  - Proper content-type headers for uploaded images
  - File size validation in response headers

- **File Validation Tests**

  - File size limits (max 5MB, returns 422/413 for oversized files)
  - File type validation (only image types allowed)
  - Proper error responses for invalid files

- **Integration Tests**
  - End-to-end flow: upload → storage → public access
  - Metadata preservation and URL generation
  - Error handling for upload failures

### Test Utilities (`utils.ts`)

- **API Client Setup**: Type-safe Eden Treaty client with cookie management
- **Test Data Generation**: Helper functions for creating test images and files
- **Session Management**: Consistent session ID generation for test isolation
- **Authentication**: Automatic member ID cookie handling

### Test Features

- **Type Safety**: Full TypeScript integration with Eden Treaty for compile-time API validation
- **Isolation**: Each test uses unique session IDs to prevent interference
- **Authentication**: Automatic cookie management for authenticated endpoints
- **File Testing**: Binary file upload testing with validation
- **Error Handling**: Comprehensive error scenario testing with proper status codes
- **Real Integration**: Tests against actual Redis and R2 services (not mocked)

### Running Tests

```bash
# Start development server
bun run dev:api

# Run all E2E tests
bun test e2e

# Run specific test suites
bun test e2e/base.test.ts      # Base functionality
bun test e2e/redis.test.ts     # Redis integration
bun test e2e/s3.test.ts        # S3/R2 storage

# Run with coverage
bun test --coverage
```

**Test Environment Requirements:**

- E2E_NEXT_API_DOMAIN environment variable configured to domain of server (i.e., `http://localhost:3000`)
- Redis instance (local or remote via `REDIS_URL`)
- Cloudflare R2 bucket with proper credentials
- All environment variables configured as per setup instructions

## Getting Started

Run the development servers:

```bash
bun run --bun dev:next & bun run --bun dev:api
```

- **Next.js app**: [http://localhost:3001](http://localhost:3001)
- **Elysia API server**: [http://localhost:3000/api](http://localhost:3000/api)

## Environment Setup

### Redis Configuration

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

### Cloudflare R2 Configuration

To use the image upload feature, you'll need a Cloudflare R2 bucket. Add the following environment variables:

```bash
# .env.local
NEXT_PUBLIC_R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
NEXT_PUBLIC_R2_ACCESS_KEY=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
NEXT_PUBLIC_R2_BUCKET=your-bucket-name
NEXT_PUBLIC_R2_HOST=your-custom-domain.com
# or use the default R2.dev URL:
# NEXT_PUBLIC_R2_HOST=pub-YOUR_HASH.r2.dev
```

To set up Cloudflare R2:

1. **Create an R2 bucket** in your Cloudflare dashboard
2. **Generate API tokens** with R2 read/write permissions
3. **Configure public access** (optional) for direct image access
4. **Set up custom domain** (recommended) for better caching and CDN benefits

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
      "runtime": "@godsreveal/vercel-bun@0.2.4"
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

### Cloudflare R2 on Vercel

For production image upload functionality:

1. **Set up Cloudflare R2** bucket with your Cloudflare account
2. **Configure environment variables** in your Vercel project settings:
   - `NEXT_PUBLIC_R2_ENDPOINT`
   - `NEXT_PUBLIC_R2_ACCESS_KEY`
   - `R2_SECRET_ACCESS_KEY`
   - `NEXT_PUBLIC_R2_BUCKET`
   - `NEXT_PUBLIC_R2_HOST`
3. **Configure CORS** on your R2 bucket for web uploads (if needed)
4. **Set up custom domain** for better performance and caching

Deploy your GitHub repository to [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). The serverless functions will automatically use Bun instead of Node.js for improved performance.

**Live Demo**: [vercel-bun-nine.vercel.app](https://vercel-bun-nine.vercel.app)

## Architecture Highlights

### Frontend Architecture

- **React 19** with Next.js 15 for modern React features
- **TanStack Query** for intelligent server state management
- **Eden Treaty** for type-safe API communication
- **Tailwind CSS** for utility-first styling
- **Radix UI** components for accessible UI primitives
- **Drag & drop file upload** with visual feedback and progress tracking

### Backend Architecture

- **Elysia.js** framework for high-performance APIs
- **Bun's native Redis client** for direct Redis communication
- **Bun's native S3 client** for Cloudflare R2 integration
- **Session-based storage** with automatic cleanup
- **File upload handling** with validation and metadata management
- **Type validation** with Elysia's built-in schema system
- **CORS support** for cross-origin requests

### Type Safety Flow

```
1. Elysia route definitions → 2. Eden client generation → 3. React Query hooks → 4. UI components
```

This creates a fully type-safe data flow from API endpoints to UI components with automatic TypeScript inference.

### Storage Architecture

- **Session-scoped data** in Redis with automatic TTL
- **Persistent file storage** in Cloudflare R2 with CDN delivery
- **Metadata synchronization** between Redis (session state) and R2 (file storage)
- **Optimistic UI updates** with conflict resolution

## Learn More

### About This Runtime

- [vercel-bun Documentation](../README.md) - Learn about the custom Bun runtime
- [Bun Runtime](https://bun.sh) - High-performance JavaScript runtime
- [Bun Redis Client](https://bun.sh/docs/api/redis) - Native Redis support in Bun
- [Bun S3 Client](https://bun.sh/docs/api/s3) - Native S3-compatible storage client

### Cloud Storage

- [Cloudflare R2](https://developers.cloudflare.com/r2/) - S3-compatible object storage
- [R2 API Documentation](https://developers.cloudflare.com/r2/api/) - Complete R2 API reference
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/) - Cost-effective storage pricing

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
