import { Elysia, t } from "elysia";

export const contentRoutes = new Elysia({ prefix: "/content" })

  .get(
    "/json",
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
    "/text",
    ({ set }) => {
      set.headers["content-type"] = "text/plain";
      return "Plain text response";
    },
    {
      response: t.String(),
    }
  )

  .get(
    "/html",
    ({ set }) => {
      set.headers["content-type"] = "text/html";
      return "<html><body><h1>HTML Response</h1></body></html>";
    },
    {
      response: t.String(),
    }
  )

  .get(
    "/xml",
    ({ set }) => {
      set.headers["content-type"] = "application/xml";
      return '<?xml version="1.0"?><root><message>XML response</message></root>';
    },
    {
      response: t.String(),
    }
  );
