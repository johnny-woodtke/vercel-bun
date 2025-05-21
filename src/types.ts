import type {
  BuildV3,
  PrepareCache,
  ShouldServe,
  StartDevServer,
} from "@vercel/build-utils";

export interface Runtime {
  version: number;
  build: BuildV3;
  prepareCache?: PrepareCache;
  shouldServe?: ShouldServe;
  startDevServer?: StartDevServer;
}
