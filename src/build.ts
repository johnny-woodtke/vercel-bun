import {
  download,
  getNodeVersion,
  getProvidedRuntime,
  Lambda,
  type BuildV3,
  type Files,
} from "@vercel/build-utils";

export const build: BuildV3 = async function ({
  files,
  config,
  entrypoint,
  workPath,
  repoRootPath,
  meta,
  ...rest
}) {
  // Check if dev mode is used
  if (meta?.isDev) {
    console.log("`vercel dev` is not supported right now");
    process.exit(255);
  }

  console.log("Downloading user files");

  // Download the user files
  const userFiles: Files = await download(files, workPath, meta);

  console.log("Downloading Bun runtime files");

  // Download runtime files containing Bun bins and libs
  const runtimeFiles: Files = {
    // Append Bun files
  };

  // Get node version
  const nodeVersion = await getNodeVersion(workPath);

  console.log(`Using Node runtime: ${nodeVersion.runtime}`);

  // Get provided version
  const providedVersion = await getProvidedRuntime();

  console.log(`Using provided runtime: ${providedVersion}`);

  // Log config and other inputs
  console.log(
    "Config and other inputs",
    JSON.stringify(
      {
        config,
        entrypoint,
        workPath,
        repoRootPath,
      },
      null,
      2
    )
  );

  console.log("Creating Lambda");

  // Create Lambda
  const lambda = new Lambda({
    files: {
      ...userFiles,
      ...runtimeFiles,
    },
    handler: entrypoint,
    runtime: nodeVersion.runtime,
  });

  // Return the Lambda function
  return {
    output: lambda,
  };
};
