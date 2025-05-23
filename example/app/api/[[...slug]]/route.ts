import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" }).get(
  "/hello1",
  ({ query }) => `Hello 1 ${query.firstName} ${query.lastName}`,
  {
    query: t.Object({ firstName: t.String(), lastName: t.String() }),
  }
);

export const GET = app.handle;
export const POST = app.handle;
