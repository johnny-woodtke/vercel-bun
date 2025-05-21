import { shouldServe } from "@vercel/build-utils";

import { build } from "./build";
import { prepareCache } from "./prepare-cache";
import type { Runtime } from "./types";

export default {
  version: 3,
  build,
  prepareCache,
  shouldServe,
  startDevServer: undefined,
} as const satisfies Runtime;
