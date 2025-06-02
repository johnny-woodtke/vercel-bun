import { treaty } from "@elysiajs/eden";

import type { App } from "@/api";

export function getApiClient() {
  const domain = Bun.env.E2E_API_DOMAIN;
  if (!domain) {
    throw new Error("E2E_API_DOMAIN environment variable is required");
  }
  return treaty<App>(domain).api;
}
