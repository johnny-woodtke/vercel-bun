import {
  download,
  FileFsRef,
  getProvidedRuntime,
  Lambda,
  type BuildV3,
  type Files,
} from "@vercel/build-utils";
import { mkdir, writeFile } from "fs/promises";
import JSZip from "jszip";
import { dirname, join, resolve } from "path";

const buildConfig = {
  defaultBunVersion: "1.2.13",
  defaultArch: "x64",
} as const;

export const build: BuildV3 = async function ({
  files,
  config,
  entrypoint,
  workPath,
  repoRootPath,
  meta,
}) {
  // Determine architecture - Vercel's AWS Lambda runs on x64 by default
  console.log(`Process arch: ${process.arch}`);
  const arch = process.arch === "arm64" ? "aarch64" : buildConfig.defaultArch;

  // Get the Bun binary URL for the right architecture
  const { href } = new URL(
    `https://bun.sh/download/${buildConfig.defaultBunVersion}/linux/${arch}?avx2=true`
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

  // Load the archive
  let archive = await JSZip.loadAsync(await res.arrayBuffer()).catch((e) => {
    console.log(`Failed to load bun binary: ${(e as Error).message}`);
    throw e;
  });
  console.log(`Extracted archive: ${Object.keys(archive.files)}`);

  // Get bun from archive
  const bun = archive.filter(
    (_, { dir, name }) => !dir && name.endsWith("bun")
  )[0];
  if (!bun) {
    throw new Error("Failed to find executable in zip");
  }

  // Get cwd of bun
  const cwd = bun.name.split("/")[0];
  archive = cwd ? archive.folder(cwd) ?? archive : archive;

  // Get the directory where this file is located
  const currentDir = dirname(__filename);
  console.log(`Current directory: ${currentDir}`);

  // Extract the binary to the workPath
  const bunBinaryPath = resolve(currentDir, "bin");
  await mkdir(bunBinaryPath, { recursive: true });

  // Generate the archive and save the Bun binary
  const bunExecutable = await bun.async("nodebuffer");
  const bunOutputPath = resolve(bunBinaryPath, "bun");
  await writeFile(bunOutputPath, bunExecutable, { mode: 0o755 });

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
    "bin/bun": new FileFsRef({
      mode: 0o755,
      fsPath: bunOutputPath,
    }),
  };
  console.log("Runtime files");
  console.log(JSON.stringify(runtimeFiles, null, 2));

  // Download the user files
  const userFiles: Files = await download(files, workPath, meta);
  console.log("User files");
  console.log(JSON.stringify(userFiles, null, 2));

  // Create Lambda
  const lambda = new Lambda({
    files: {
      ...userFiles,
      ...runtimeFiles,
    },
    handler: config.projectSettings?.rootDirectory
      ? join(config.projectSettings.rootDirectory, entrypoint)
      : entrypoint,
    runtime: await getProvidedRuntime(),
  });

  // Return the Lambda function
  return {
    output: lambda,
  };
};
