import { build } from "./build";
import type { Runtime } from "./types";

export default {
  version: 3,
  build,
} as const satisfies Runtime;
