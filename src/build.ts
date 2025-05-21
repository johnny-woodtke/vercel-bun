import {
  download,
  getNodeVersion,
  Lambda,
  type BuildV3,
  type Files,
} from "@vercel/build-utils";

export const build: BuildV3 = async function ({
  files,
  entrypoint,
  workPath,
  meta,
}) {
  // Check if dev mode is used
  if (meta?.isDev) {
    console.log("`vercel dev` is not supported right now");
    process.exit(255);
  }

  console.log("Downloading user files");

  // Download the user files
  const userFiles: Files = await download(files, workPath, meta);

  console.log("User files");
  console.log(JSON.stringify(userFiles, null, 2));

  console.log("Downloading Bun runtime files");

  // Download runtime files containing Bun bins and libs
  const runtimeFiles: Files = {
    // Append Bun files
  };

  console.log("Creating Lambda");

  // Get node version
  const nodeVersion = await getNodeVersion(workPath);

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
