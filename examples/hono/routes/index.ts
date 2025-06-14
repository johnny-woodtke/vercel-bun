import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

export const app = new Hono()
  .basePath("/api")

  .get("/", (c) => c.text(`Hello from bun@${Bun.version}`))

  .get(
    "/hello",
    zValidator(
      "query",
      z.object({
        firstName: z.string(),
        lastName: z.string(),
      })
    ),
    (c) =>
      c.text(`Hello ${c.req.query("firstName")} ${c.req.query("lastName")}`)
  );
