import { treaty } from "@elysiajs/eden";

import type { App } from "@/api";
import { getApiHost } from "@/lib/utils";

export const eden = treaty<App>(getApiHost(), {
  fetch: {
    credentials: "include", // Include cookies in cross-origin requests
  },
});
