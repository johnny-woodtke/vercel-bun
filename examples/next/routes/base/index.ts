import { Elysia } from "elysia";

import { contentRoutes } from "./content";
import { headersRoutes } from "./headers";
import { methodsRoutes } from "./methods";
import { paramsRoutes } from "./params";
import { statusRoutes } from "./status";

export const baseRoutes = new Elysia({ prefix: "/base" })
  .use(contentRoutes)
  .use(headersRoutes)
  .use(methodsRoutes)
  .use(paramsRoutes)
  .use(statusRoutes);
