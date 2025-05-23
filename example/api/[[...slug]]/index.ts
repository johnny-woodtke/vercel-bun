import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" })
  .get("/", () => `Hello from bun@${Bun.version}`, {
    response: t.String(),
  })
  .get(
    "/hello",
    ({ params }) => ({
      message: `Hello ${params.firstName} ${params.lastName}`,
    }),
    {
      params: t.Object({ firstName: t.String(), lastName: t.String() }),
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
