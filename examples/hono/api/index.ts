import { app } from "@/routes";

if (Bun.env.NODE_ENV !== "production") {
  const port = Bun.env.NEXT_PUBLIC_API_PORT || 3000;

  Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(`🚀 Hono is running at http://localhost:${port}/api`);
}

export type App = typeof app;

export default app.fetch;
