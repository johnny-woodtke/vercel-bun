import { Lambda } from "@vercel/build-utils";
import type { LambdaOptionsWithFiles } from "@vercel/build-utils/dist/lambda";

export interface BunLambdaOptions
  extends Omit<LambdaOptionsWithFiles, "runtime" | "supportsWrapper"> {}

export interface BunLambdaBuildOptions {
  entrypoint: string;
  cwd: string;
  cacheDir: string;
  defaultBunVersion?: string;
  includeFiles?: string[];
}

export class BunLambda extends Lambda {
  constructor(options: BunLambdaOptions) {
    super({
      ...options,
      runtime: "provided.al2",
      supportsWrapper: true,
    });
  }

  static async build(options: BunLambdaBuildOptions): Promise<BunLambda> {
    return new BunLambda({
      handler: options.entrypoint,
      files: {},
    });
  }
}
