import {
  download,
  FileFsRef,
  getProvidedRuntime,
  Lambda,
  type BuildV3,
  type Files,
} from "@vercel/build-utils";
import { join } from "path";

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

  // Download runtime files containing Bun modules
  const runtimeFiles: Files = {
    // Append Bun files
    bootstrap: new FileFsRef({
      mode: 0o755, // Make it executable
      fsPath: join(__dirname, "bootstrap"),
    }),
    "runtime.ts": new FileFsRef({
      mode: 0o644,
      fsPath: join(__dirname, "runtime.ts"),
    }),
  };

  // Get provided runtime
  const providedRuntime = await getProvidedRuntime();

  console.log(`Using provided runtime: ${providedRuntime}`);

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
    handler: config.projectSettings?.rootDirectory
      ? join(config.projectSettings.rootDirectory, entrypoint)
      : entrypoint,
    runtime: providedRuntime,
  });

  // Return the Lambda function
  return {
    output: lambda,
  };
};
