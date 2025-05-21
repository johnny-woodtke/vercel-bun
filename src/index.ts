// Exports should satify the Runtime interface defined in DEVELOPING_A_RUNTIME.md
export { shouldServe } from "@vercel/build-utils";

export { build } from "./build";
export { prepareCache } from "./prepare-cache";
export { startDevServer } from "./start-dev-server";
export { version } from "./version";
