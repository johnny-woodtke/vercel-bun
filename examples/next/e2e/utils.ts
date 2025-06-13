import { treaty } from "@elysiajs/eden";
import { v4 as uuidv4 } from "uuid";

import type { App } from "@/api";

export const TEST_MEMBER_ID = uuidv4();

export function getTestSessionId() {
  return uuidv4();
}

export function getApiClient(withMemberId = true) {
  const domain = Bun.env.E2E_NEXT_API_DOMAIN;
  if (!domain) {
    throw new Error("E2E_NEXT_API_DOMAIN environment variable is required");
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

type CreateTestImageFileParams = {
  name: string;
  size: number;
};

export function createTestImageFile({ name, size }: CreateTestImageFileParams) {
  // Create a simple image-like binary data
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);

  // Fill with some pattern to simulate image data
  for (let i = 0; i < size; i++) {
    view[i] = i % 256;
  }

  const file = new File([buffer], name, { type: "image/jpeg" });
  return file;
}
