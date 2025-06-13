import { Elysia, t } from "elysia";

export const statusRoutes = new Elysia({ prefix: "/status" })

  .post("/200", () => "OK" as const, {
    response: {
      200: t.Literal("OK"),
    },
  })

  .post(
    "/400",
    ({ set }) => {
      set.status = 400;
      return "Bad Request";
    },
    {
      response: {
        400: t.Literal("Bad Request"),
      },
    }
  )

  .post(
    "/404",
    ({ set }) => {
      set.status = 404;
      return "Not Found";
    },
    {
      response: {
        404: t.Literal("Not Found"),
      },
    }
  )

  .post(
    "/405",
    ({ set }) => {
      set.status = 405;
      return "Method Not Allowed";
    },
    {
      response: {
        405: t.Literal("Method Not Allowed"),
      },
    }
  )

  .post(
    "/429",
    ({ set }) => {
      set.status = 429;
      return "Too Many Requests";
    },
    {
      response: {
        429: t.Literal("Too Many Requests"),
      },
    }
  )

  .post(
    "/500",
    ({ set }) => {
      set.status = 500;
      return "Internal Server Error";
    },
    {
      response: {
        500: t.Literal("Internal Server Error"),
      },
    }
  );
