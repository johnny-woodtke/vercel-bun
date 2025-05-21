import { getProvidedRuntime, type BuildV3 } from "@vercel/build-utils";

import { BunLambda } from "./bun-lambda";

export const build: BuildV3 = async function (options) {
  const output = await BunLambda.build({
    ...options,
    cwd: options.workPath,
    cacheDir: options.workPath,
  });
  output.runtime = await getProvidedRuntime();
  return { output };
};
