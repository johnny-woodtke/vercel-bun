import { app } from "@/routes";

if (Bun.env.NODE_ENV !== "production") {
  app.listen({ port: Bun.env.NEXT_PUBLIC_API_PORT || 3000 });
  console.log(`🚀 Elysia is running at ${app.server?.url?.toString()}api`);
}

export type App = typeof app;

export default app.handle;
