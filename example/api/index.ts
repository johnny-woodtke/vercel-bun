import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" })

  .get("/", () => `Hello from bun@${Bun.version}`, {
    response: t.String(),
  })

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
        name: t.Optional(t.String()),
        email: t.Optional(t.String()),
      }),
      response: t.Union([
        t.Object({
          id: t.Number(),
          name: t.Optional(t.String()),
          email: t.Optional(t.String()),
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
    ({ set }) => {
      set.headers["cache-control"] = "public, max-age=3600";
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

if (process.env.NODE_ENV !== "production") {
  app.listen({ port: 3000 });
  console.log("Server is running on http://localhost:3000");
}

export default app.handle;
