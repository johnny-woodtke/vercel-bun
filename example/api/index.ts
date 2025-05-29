import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { cacheControl, CacheControl } from "elysiajs-cdn-cache";

import { SessionRedisService } from "@/lib/redis";

const app = new Elysia({ prefix: "/api" })
  .use(
    cors({
      origin: true,
      credentials: true,
    })
  )
  .use(cacheControl())

  // Add sessionId to the context
  .resolve({ as: "global" }, ({ cookie }) => {
    if (!cookie.sessionId.value) {
      cookie.sessionId.value = crypto.randomUUID();
      cookie.sessionId.httpOnly = true;
      cookie.sessionId.maxAge = 86400; // 24 hours
      cookie.sessionId.sameSite = "none";
      cookie.sessionId.secure = true;
    }
    return {
      sessionId: cookie.sessionId.value,
    };
  })

  .get("/", () => `Hello from bun@${Bun.version}`, {
    response: t.String(),
  })

  // Redis Demo Endpoints
  .post(
    "/redis/entries",
    async ({ body, sessionId, set }) => {
      try {
        const redisService = new SessionRedisService(sessionId);

        const entry = await redisService.addEntry(body.text);

        set.status = 201;
        return {
          success: true,
          data: entry,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to add entry",
        };
      }
    },
    {
      body: t.Object({
        text: t.String({ minLength: 1, maxLength: 1000 }),
      }),
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          data: t.Object({
            id: t.String(),
            text: t.String(),
            createdAt: t.String(),
            expiresAt: t.String(),
            ttl: t.Number(),
          }),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  .get(
    "/redis/entries",
    async ({ sessionId, set }) => {
      try {
        const redisService = new SessionRedisService(sessionId);

        const entries = await redisService.getAllEntries();

        return {
          success: true,
          data: entries,
          count: entries.length,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to fetch entries",
        };
      }
    },
    {
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          data: t.Array(
            t.Object({
              id: t.String(),
              text: t.String(),
              createdAt: t.String(),
              expiresAt: t.String(),
              ttl: t.Number(),
            })
          ),
          count: t.Number(),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  .delete(
    "/redis/entries/:id",
    async ({ params, sessionId, set }) => {
      try {
        const redisService = new SessionRedisService(sessionId);

        const deleted = await redisService.deleteEntry(params.id);

        if (!deleted) {
          set.status = 404;
          return {
            success: false,
            error: "Entry not found",
          };
        }

        return {
          success: true,
          message: "Entry deleted successfully",
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to delete entry",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          message: t.String(),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  .get(
    "/redis/stats",
    async ({ sessionId }) => {
      try {
        const redisService = new SessionRedisService(sessionId);

        const count = await redisService.getEntryCount();

        return {
          success: true,
          data: {
            sessionId,
            entryCount: count,
            ttlSeconds: 120,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: "Failed to fetch stats",
        };
      }
    },
    {
      response: t.Union([
        t.Object({
          success: t.Literal(true),
          data: t.Object({
            sessionId: t.String(),
            entryCount: t.Number(),
            ttlSeconds: t.Number(),
          }),
        }),
        t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      ]),
    }
  )

  .get("/hello", ({ query }) => `Hello ${query.firstName} ${query.lastName}`, {
    query: t.Object({
      firstName: t.String(),
      lastName: t.String(),
    }),
    response: t.String(),
  })

  .get(
    "/users/:id",
    ({ params, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      return {
        id: userId,
        name: "John Doe",
        email: "john@example.com",
        createdAt: new Date().toISOString(),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Union([
        t.Object({
          id: t.Number(),
          name: t.String(),
          email: t.String(),
          createdAt: t.String(),
        }),
        t.Object({
          error: t.String(),
        }),
      ]),
    }
  )

  .get(
    "/status/:code",
    ({ params, set }) => {
      const statusCode = parseInt(params.code);

      // Validate status code range
      if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
        set.status = 400;
        return { error: "Invalid status code. Must be between 100-599" };
      }

      set.status = statusCode;
      set.headers["x-custom-header"] = "test-value";
      switch (statusCode) {
        case 200:
          return { message: "OK" };
        case 201:
          return { message: "Created" };
        case 400:
          return { error: "Bad Request" };
        case 401:
          return { error: "Unauthorized" };
        case 403:
          return { error: "Forbidden" };
        case 404:
          return { error: "Not Found" };
        case 500:
          return { error: "Internal Server Error" };
        default:
          return { message: `Status ${statusCode}` };
      }
    },
    {
      params: t.Object({
        code: t.String(),
      }),
      response: t.Union([
        t.Object({
          message: t.String(),
        }),
        t.Object({
          error: t.String(),
        }),
      ]),
    }
  )

  .post(
    "/users",
    async ({ body }) => {
      return { success: true, data: body };
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
      }),
      response: t.Object({
        success: t.Boolean(),
        data: t.Object({
          name: t.String(),
          email: t.String(),
        }),
      }),
    }
  )

  .post(
    "/files",
    async ({ body, set }) => {
      set.status = 201;
      set.headers["location"] = "/api/files/123";
      return {
        id: 123,
        filename: body.filename,
        size: body.content.length,
        uploadedAt: new Date().toISOString(),
      };
    },
    {
      body: t.Object({
        filename: t.String(),
        content: t.String(),
      }),
      response: t.Object({
        id: t.Number(),
        filename: t.String(),
        size: t.Number(),
        uploadedAt: t.String(),
      }),
    }
  )

  .put(
    "/users/:id",
    ({ params, body, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      return {
        id: userId,
        name: body.name,
        email: body.email,
        updatedAt: new Date().toISOString(),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.String(),
        email: t.String(),
      }),
      response: t.Union([
        t.Object({
          id: t.Number(),
          name: t.String(),
          email: t.String(),
          updatedAt: t.String(),
        }),
        t.Object({
          error: t.String(),
        }),
      ]),
    }
  )

  .patch(
    "/users/:id",
    ({ params, body, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      // Simulate getting existing user data
      const existingUser = {
        id: userId,
        name: "John Doe",
        email: "john@example.com",
      };

      // Only update provided fields
      const updatedUser = {
        id: userId,
        name: body.name ?? existingUser.name,
        email: body.email ?? existingUser.email,
        updatedAt: new Date().toISOString(),
      };

      return updatedUser;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        email: t.Optional(t.String()),
      }),
      response: t.Union([
        t.Object({
          id: t.Number(),
          name: t.String(),
          email: t.String(),
          updatedAt: t.String(),
        }),
        t.Object({
          error: t.String(),
        }),
      ]),
    }
  )

  .delete(
    "/users/:id",
    ({ params, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Union([
        t.Object({
          error: t.String(),
        }),
        t.Void(),
      ]),
    }
  )

  .head(
    "/users/:id",
    ({ params, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 404;
        return;
      }

      set.headers["x-user-exists"] = "true";
      set.headers["content-type"] = "application/json";
      set.headers["content-length"] = "100";
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Void(),
    }
  )

  .options(
    "/users",
    ({ set }) => {
      set.headers["access-control-allow-origin"] = "*";
      set.headers["access-control-allow-methods"] =
        "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS";
      set.headers["access-control-allow-headers"] =
        "Content-Type, Authorization";
      set.headers["access-control-max-age"] = "86400";
    },
    {
      response: t.Void(),
    }
  )

  .options(
    "/users/:id",
    ({ set, params }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      set.headers["access-control-allow-origin"] = "*";
      set.headers["access-control-allow-methods"] =
        "GET, PUT, PATCH, DELETE, HEAD, OPTIONS";
      set.headers["access-control-allow-headers"] =
        "Content-Type, Authorization";
      set.headers["access-control-max-age"] = "86400";
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Union([
        t.Object({
          error: t.String(),
        }),
        t.Void(),
      ]),
    }
  )

  .get(
    "/content/json",
    ({ set }) => {
      set.headers["content-type"] = "application/json";
      return { message: "JSON response", timestamp: new Date().toISOString() };
    },
    {
      response: t.Object({
        message: t.String(),
        timestamp: t.String(),
      }),
    }
  )

  .get(
    "/content/text",
    ({ set }) => {
      set.headers["content-type"] = "text/plain";
      return "Plain text response";
    },
    {
      response: t.String(),
    }
  )

  .get(
    "/content/html",
    ({ set }) => {
      set.headers["content-type"] = "text/html";
      return "<html><body><h1>HTML Response</h1></body></html>";
    },
    {
      response: t.String(),
    }
  )

  .get(
    "/content/xml",
    ({ set }) => {
      set.headers["content-type"] = "application/xml";
      return '<?xml version="1.0"?><root><message>XML response</message></root>';
    },
    {
      response: t.String(),
    }
  )

  .get(
    "/headers",
    ({ headers, set }) => {
      set.headers["x-custom-response"] = "custom-value";
      set.headers["x-timestamp"] = new Date().toISOString();
      return {
        receivedHeaders: headers,
        message: "Headers endpoint",
      };
    },
    {
      response: t.Object({
        receivedHeaders: t.Record(
          t.String(),
          t.Union([t.String(), t.Undefined()])
        ),
        message: t.String(),
      }),
    }
  )

  .post(
    "/cookies",
    ({ cookie }) => {
      cookie.sessionId.value = "abc123";
      cookie.sessionId.httpOnly = true;
      cookie.sessionId.secure = true;
      cookie.sessionId.sameSite = "strict";

      cookie.preferences.value = "theme-dark";
      cookie.preferences.maxAge = 86400;

      return { message: "Cookies set successfully" };
    },
    {
      response: t.Object({
        message: t.String(),
      }),
    }
  )

  .get(
    "/cache",
    ({ cacheControl }) => {
      cacheControl.set(
        "Cache-Control",
        new CacheControl().set("public", true).set("max-age", 60)
      );

      return {
        message: "Cache control header set",
        timestamp: new Date().toISOString(),
      };
    },
    {
      response: t.Object({
        message: t.String(),
        timestamp: t.String(),
      }),
    }
  );

if (Bun.env.NODE_ENV !== "production") {
  app.listen({ port: Bun.env.NEXT_PUBLIC_API_PORT || 3000 });
  console.log(`🚀 Elysia is running at ${app.server?.url?.toString()}api`);
}

export type App = typeof app;

export default app.handle;
