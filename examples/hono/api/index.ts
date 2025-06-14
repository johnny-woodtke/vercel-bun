import { app } from "@/routes";

if (Bun.env.NODE_ENV !== "production") {
  Bun.serve({
    port: Bun.env.NEXT_PUBLIC_API_PORT || 3000,
    fetch: app.fetch,
  });
}

export type App = typeof app;

export default app.fetch;
