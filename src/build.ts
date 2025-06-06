import {
  download,
  FileFsRef,
  getProvidedRuntime,
  glob,
  Lambda,
  type BuildV3,
  type Files,
} from "@vercel/build-utils";
import { mkdir, writeFile } from "fs/promises";
import JSZip from "jszip";
import { dirname, resolve } from "path";

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
  const arch = process.arch === "arm64" ? "aarch64" : buildConfig.defaultArch;

  // Determine Bun version
  const bunVersion = process.env.BUN_VERSION ?? buildConfig.defaultBunVersion;

  // Get the Bun binary URL for the right architecture
  const { href } = new URL(
    `https://bun.sh/download/${bunVersion}/linux/${arch}?avx2=true`
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

  // Ensure the archive isn't a directory
  const cwd = bun.name.split("/")[0];
  archive = cwd ? archive.folder(cwd) ?? archive : archive;

  // Get the directory where this file is located
  const currentDir = dirname(__filename);

  // Extract the binary to the workPath
  const bunBinaryPath = resolve(currentDir, "bin");
  await mkdir(bunBinaryPath, { recursive: true });

  // Generate the archive and save the Bun binary
  const bunExecutable = await bun.async("nodebuffer");
  const bunOutputPath = resolve(bunBinaryPath, "bun");
  await writeFile(bunOutputPath, bunExecutable, { mode: 0o755 });

  // Save bun binary and runtime files
  const runtimeFiles: Files = {
    // Save bun binary
    "bin/bun": new FileFsRef({
      mode: 0o755,
      fsPath: bunOutputPath,
    }),

    // Save bootstrap
    bootstrap: new FileFsRef({
      mode: 0o755, // Make it executable
      fsPath: resolve(currentDir, "bootstrap"),
    }),

    // Save runtime files
    ...(await glob("runtime/**", currentDir)),
  };

  // Download the user files
  const userFiles: Files = await download(files, workPath, meta);

  // Create Lambda
  const lambda = new Lambda({
    files: {
      ...userFiles,
      ...runtimeFiles,
    },
    handler: entrypoint,
    runtime: await getProvidedRuntime(),
  });
  console.log(`Created Lambda with bun@${bunVersion} runtime`);

  // Return the Lambda function
  return {
    output: lambda,
  };
};
