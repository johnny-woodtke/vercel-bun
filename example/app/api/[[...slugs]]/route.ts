import { Elysia, t } from "elysia";
import { serve } from "bun";

const app = new Elysia({ prefix: "/api" })
  .get("/", () => "Hello World")
  .post("/", ({ body }) => `What's up, ${body.name}?`, {
    body: t.Object({
      name: t.String(),
    }),
  });

export const GET = app.handle;
export const POST = app.handle;
