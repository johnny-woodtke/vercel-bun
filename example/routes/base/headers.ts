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
          message: t.String(),
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
          headerName: t.String(),
          message: t.String(),
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
        message: `Cookie ${cookieName} set`,
      };
    },
    {
      response: {
        200: t.Object({
          cookieName: t.String(),
          message: t.String(),
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
