import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" }).get(
  "/hello1",
  ({ query }) => `Hello 1 ${query.firstName} ${query.lastName}`,
  {
    query: t.Object({ firstName: t.String(), lastName: t.String() }),
  }
);

const isDev = process.env.NODE_ENV !== "production";

if (isDev) {
  app.listen({
    port: 3000,
  });
  console.log("Server is running on http://localhost:3000");
}

export default app.handle;
