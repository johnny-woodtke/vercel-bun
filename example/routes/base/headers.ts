import { getVercelEnv } from "@/lib/utils";
import { Elysia, t } from "elysia";

export const headersRoutes = new Elysia({ prefix: "/headers" })

  .get(
    "/cache-control",
    ({ set }) => {
      set.headers["cache-control"] = "public, max-age=60";
      return {
        message: "Cache control header set",
        timestamp: new Date().getTime(),
      };
    },
    {
      response: {
        200: t.Object({
          message: t.Literal("Cache control header set"),
          timestamp: t.Number(),
        }),
      },
    }
  )

  .get(
    "/custom",
    ({ set }) => {
      const headerName = "x-custom-header";
      set.headers[headerName] = "test";
      return {
        headerName,
        message: "Custom header set",
      };
    },
    {
      response: {
        200: t.Object({
          headerName: t.Literal("x-custom-header"),
          message: t.Literal("Custom header set"),
        }),
      },
    }
  )

  .get(
    "/cookie",
    ({ cookie }) => {
      const cookieName = "x-elysia-cookie";

      cookie[cookieName].value = "test";
      cookie[cookieName].httpOnly = true;

      const env = getVercelEnv();
      if (env) {
        cookie[cookieName].secure = true;
        cookie[cookieName].sameSite = "none";
      }

      return {
        cookieName,
        message: "Cookie set",
      };
    },
    {
      response: {
        200: t.Object({
          cookieName: t.Literal("x-elysia-cookie"),
          message: t.Literal("Cookie set"),
        }),
      },
    }
  )

  .post(
    "/cookie",
    ({ cookie }) => ({
      receivedCookie: cookie["x-test-cookie"].value,
    }),
    {
      cookie: t.Object({
        ["x-test-cookie"]: t.String(),
      }),
      response: {
        200: t.Object({
          receivedCookie: t.String(),
        }),
      },
    }
  );
