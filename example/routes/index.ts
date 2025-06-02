import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { cacheControl, CacheControl } from "elysiajs-cdn-cache";

import { contentRoutes } from "./content";
import { redisRoutes } from "./redis";
import { usersRoutes } from "./users";

export const app = new Elysia({ prefix: "/api" })
  .use(
    cors({
      origin: true,
      credentials: true,
    })
  )

  .use(redisRoutes)
  .use(usersRoutes)
  .use(contentRoutes)

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
    "/status/:code",
    ({ params, set }) => {
      // Validate status code
      const statusCode = parseInt(params.code, 10);

      // Validate status code range
      if (Number.isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
        set.status = 400;
        return { error: "Invalid status code. Must be between 100-599" };
      }

      // Set custom header
      set.headers["x-custom-header"] = "test-value";

      // Return response based on status code
      if (statusCode === 200) {
        set.status = 200;
        return { message: "OK" };
      }

      if (statusCode === 201) {
        set.status = 201;
        return { message: "Created" };
      }

      if (statusCode === 400) {
        set.status = 400;
        return { error: "Bad Request" };
      }

      if (statusCode === 404) {
        set.status = 404;
        return { error: "Not Found" };
      }

      if (statusCode === 500) {
        set.status = 500;
        return { error: "Internal Server Error" };
      }

      set.status = statusCode;
      return { message: `Status ${statusCode}` };
    },
    {
      params: t.Object({
        code: t.String(),
      }),
      response: {
        200: t.Object({
          message: t.Literal("OK"),
        }),
        201: t.Object({
          message: t.Literal("Created"),
        }),
        400: t.Object({
          error: t.Union([
            t.Literal("Bad Request"),
            t.Literal("Invalid status code. Must be between 100-599"),
          ]),
        }),
        401: t.Object({
          error: t.Literal("Unauthorized"),
        }),
        403: t.Object({
          error: t.Literal("Forbidden"),
        }),
        404: t.Object({
          error: t.Literal("Not Found"),
        }),
        500: t.Object({
          error: t.Literal("Internal Server Error"),
        }),
        default: t.Object({
          message: t.String(),
        }),
      },
    }
  )

  .post(
    "/files",
    async ({ body, set }) => {
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

  .use(cacheControl())
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
