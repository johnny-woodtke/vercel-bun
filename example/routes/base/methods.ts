import { Elysia, t } from "elysia";

export const methodsRoutes = new Elysia({ prefix: "/methods" })

  .get("/get", () => "GET request", {
    response: {
      200: t.String(),
    },
  })

  .post("/post", () => "POST request", {
    response: {
      200: t.String(),
    },
  })

  .patch("/patch", () => "PATCH request", {
    response: {
      200: t.String(),
    },
  })

  .put("/put", () => "PUT request", {
    response: {
      200: t.String(),
    },
  })

  .delete("/delete", () => "DELETE request", {
    response: {
      200: t.String(),
    },
  })

  .options("/options", () => "OPTIONS request", {
    response: {
      200: t.String(),
    },
  })

  .head("/head", () => "HEAD request", {
    response: {
      200: t.String(),
    },
  });
