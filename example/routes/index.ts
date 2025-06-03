import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

import { baseRoutes } from "./base";
import { redisRoutes } from "./redis";

export const app = new Elysia({ prefix: "/api" })
  .use(
    cors({
      origin: true,
      credentials: true,
    })
  )

  .use(baseRoutes)
  .use(redisRoutes)

  .get("/", () => `Hello from bun@${Bun.version}`, {
    response: {
      200: t.String(),
    },
  })

  .get("/hello", ({ query }) => `Hello ${query.firstName} ${query.lastName}`, {
    query: t.Object({
      firstName: t.String(),
      lastName: t.String(),
    }),
    response: {
      200: t.String(),
    },
  });
