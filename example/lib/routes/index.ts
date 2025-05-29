import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { cacheControl, CacheControl } from "elysiajs-cdn-cache";

import { contentRoutes } from "./content";
import { redisRoutes } from "./redis";
import { sessionRoutes } from "./session";
import { usersRoutes } from "./users";

export const app = new Elysia({ prefix: "/api" })
  .use(
    cors({
      origin: true,
      credentials: true,
    })
  )

  .use(sessionRoutes)
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
