import { Elysia, t } from "elysia";

export const statusRoutes = new Elysia({ prefix: "/status" })

  .post("/200", () => "OK", {
    response: {
      200: t.String(),
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
        400: t.String(),
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
        404: t.String(),
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
        405: t.String(),
      },
    }
  )

  .post(
    "/422",
    ({ set }) => {
      set.status = 422;
      return "Unprocessable Entity";
    },
    {
      response: {
        422: t.String(),
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
        429: t.String(),
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
        500: t.String(),
      },
    }
  );
