import { Elysia, t } from "elysia";

export const methodsRoutes = new Elysia({ prefix: "/methods" })

  .get("/get", () => "GET request" as const, {
    response: {
      200: t.Literal("GET request"),
    },
  })

  .post("/post", () => "POST request" as const, {
    response: {
      200: t.Literal("POST request"),
    },
  })

  .patch("/patch", () => "PATCH request" as const, {
    response: {
      200: t.Literal("PATCH request"),
    },
  })

  .put("/put", () => "PUT request" as const, {
    response: {
      200: t.Literal("PUT request"),
    },
  })

  .delete("/delete", () => "DELETE request" as const, {
    response: {
      200: t.Literal("DELETE request"),
    },
  })

  .options("/options", () => "OPTIONS request" as const, {
    response: {
      200: t.Literal("OPTIONS request"),
    },
  })

  .head("/head", () => "" as const, {
    response: {
      200: t.Literal(""),
    },
  });
