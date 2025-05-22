import {
  download,
  FileFsRef,
  getProvidedRuntime,
  Lambda,
  type BuildV3,
  type Files,
} from "@vercel/build-utils";
import JSZip from "jszip";
import { dirname, join, resolve } from "path";

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
    throw new Error("`vercel dev` is not supported right now");
  }

  // Get the Bun binary URL
  const { href } = new URL(
    "https://bun.sh/download/1.2.13/linux/aarch64?avx2=true"
  );

  console.log(`Downloading bun binary: ${href}`);

  // Download the Bun binary
  const res = await fetch(href, {
    headers: {
      "User-Agent": "@godsreveal/vercel-bun",
    },
  });

  // Notify if the Bun binary was downloaded from a different URL
  if (res.url !== href) {
    console.log(`Downloaded bun binary: ${res.url}`);
  }

  // Check if res is OK
  if (!res.ok) {
    const reason = await res.text();
    throw new Error(`Failed to download bun binary: ${reason}`);
  }

  console.log("Extracting bun binary");

  // Unzip the Bun binary
  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(await res.arrayBuffer());
  } catch (error) {
    console.log(`Failed to load bun binary: ${(error as Error).message}`);
    throw error;
  }

  console.log(`Extracted archive: ${Object.keys(archive.files)}`);

  // Get bun
  const bun = archive.filter(
    (_, { dir, name }) => !dir && name.endsWith("bun")
  )[0];
  if (!bun) {
    throw new Error("Failed to find executable in zip");
  }

  // Download the user files
  const userFiles: Files = await download(files, workPath, meta);

  console.log("Downloading Bun runtime files");

  // Get the directory where this file is located
  const currentDir = dirname(__filename);
  console.log(`Current directory: ${currentDir}`);

  // Download runtime files containing Bun modules
  const runtimeFiles: Files = {
    // Append Bun files
    bootstrap: new FileFsRef({
      mode: 0o755, // Make it executable
      fsPath: resolve(currentDir, "bootstrap"),
    }),
    "runtime.ts": new FileFsRef({
      mode: 0o644,
      fsPath: resolve(currentDir, "runtime.ts"),
    }),
  };

  // Log the paths of the runtime files
  console.log(`Bootstrap path: ${resolve(currentDir, "bootstrap")}`);
  console.log(`Runtime.ts path: ${resolve(currentDir, "runtime.ts")}`);

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
