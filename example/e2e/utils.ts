import { treaty } from "@elysiajs/eden";
import { v4 as uuidv4 } from "uuid";

import type { App } from "@/api";

export const TEST_MEMBER_ID = uuidv4();

export function getTestSessionId() {
  return uuidv4();
}

export function getApiClient(withMemberId = true) {
  const domain = Bun.env.E2E_EXAMPLE_API_DOMAIN;
  if (!domain) {
    throw new Error("E2E_EXAMPLE_API_DOMAIN environment variable is required");
  }
  return treaty<App>(domain, {
    fetch: {
      credentials: "include",
    },
    ...(withMemberId && {
      headers: {
        cookie: `memberId=${TEST_MEMBER_ID}`,
      },
    }),
  }).api;
}
