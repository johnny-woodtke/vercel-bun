import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" }).get(
  "/",
  () => `Hello from bun@${Bun.version}`,
  {
    response: t.String(),
  }
);

export const GET = app.handle;
export const POST = app.handle;
