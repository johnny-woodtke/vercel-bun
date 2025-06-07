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

const arch = process.arch === "arm64" ? "aarch64" : "x64";

const bunVersion = process.env.BUN_VERSION || "1.2.15";

const currentDir = dirname(__filename);

export const build: BuildV3 = async function ({
  files,
  entrypoint,
  workPath,
  meta,
}) {
  // Log the entrypoint
  console.log(`\nBuilding entrypoint: ${entrypoint}`);

  // Download runtime and user files
  const [runtimeFiles, userFiles] = await Promise.all([
    downloadRuntimeFiles(),
    downloadUserFiles({ files, workPath, meta }),
  ]);

  // Create Lambda
  const lambda = new Lambda({
    files: {
      ...userFiles,
      ...runtimeFiles,
    },
    handler: entrypoint,
    runtime: await getProvidedRuntime(),
  });
  console.log(`Created Lambda with bun@${bunVersion} runtime\n`);

  // Return the Lambda function
  return {
    output: lambda,
  };
};

/**
 * Downloads the user files from the build context.
 */
async function downloadUserFiles({
  files,
  workPath,
  meta,
}: Pick<
  Parameters<BuildV3>[0],
  "files" | "workPath" | "meta"
>): Promise<Files> {
  // Download the user files
  const userFiles = await download(files, workPath, meta);

  // Log results
  console.log(
    `Downloaded user files\n${Object.keys(userFiles)
      .map((file) => `  ${file}`)
      .join("\n")}`
  );

  // Return the user files
  return userFiles;
}

/**
 * Downloads the Bun binary for the right architecture.
 */
async function downloadBunBinary(): Promise<FileFsRef> {
  // Get the Bun binary URL for the right architecture
  const { href } = new URL(
    `https://bun.sh/download/${bunVersion}/linux/${arch}?avx2=true`
  );

  // Download the Bun binary
  const res = await fetch(href, {
    headers: {
      "User-Agent": "@godsreveal/vercel-bun",
    },
  });

  // Check if res is OK
  if (!res.ok) {
    const reason = await res.text();
    throw new Error(`Failed to download bun binary: ${reason}`);
  }
  console.log(`Downloaded bun binary: ${href}`);

  // Load the archive
  let archive = await JSZip.loadAsync(await res.arrayBuffer()).catch((e) => {
    console.log(`Failed to load bun binary: ${(e as Error).message}`);
    throw e;
  });

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

  // Extract the binary to the workPath
  const bunBinaryPath = resolve(currentDir, "bin");
  await mkdir(bunBinaryPath, { recursive: true });

  // Generate the archive and save the Bun binary
  const bunExecutable = await bun.async("nodebuffer");
  const bunOutputPath = resolve(bunBinaryPath, "bun");
  await writeFile(bunOutputPath, bunExecutable, { mode: 0o755 });

  // Return the Bun binary
  return new FileFsRef({
    mode: 0o755,
    fsPath: bunOutputPath,
  });
}

/**
 * Downloads the runtime files.
 */
async function downloadRuntimeFiles(): Promise<Files> {
  // Download the Bun binary and the runtime files
  const [bunBinary, runtimeFiles] = await Promise.all([
    downloadBunBinary(),
    glob("runtime/**", currentDir),
  ]);

  // Save bun binary and runtime files
  return {
    // Save bun binary
    "bin/bun": bunBinary,

    // Save bootstrap
    bootstrap: new FileFsRef({
      mode: 0o755, // Make it executable
      fsPath: resolve(currentDir, "bootstrap"),
    }),

    // Save runtime files
    ...runtimeFiles,
  };
}
