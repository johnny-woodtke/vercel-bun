import { Elysia, t } from "elysia";

export const contentRoutes = new Elysia({ prefix: "/content" })

  .get("/json", () => ({ message: "JSON response" } as const), {
    response: {
      200: t.Object({
        message: t.Literal("JSON response"),
      }),
    },
  })

  .get("/text", () => "Plain text response" as const, {
    response: {
      200: t.Literal("Plain text response"),
    },
  })

  .get(
    "/html",
    ({ set }) => {
      set.headers["content-type"] = "text/html";
      return "<html><body><h1>HTML Response</h1></body></html>" as const;
    },
    {
      response: {
        200: t.Literal("<html><body><h1>HTML Response</h1></body></html>"),
      },
    }
  )

  .get(
    "/xml",
    ({ set }) => {
      set.headers["content-type"] = "application/xml";
      return '<?xml version="1.0"?><root><message>XML response</message></root>' as const;
    },
    {
      response: {
        200: t.Literal(
          '<?xml version="1.0"?><root><message>XML response</message></root>'
        ),
      },
    }
  )

  .get("/void", () => {}, {
    response: {
      200: t.Void(),
    },
  });
