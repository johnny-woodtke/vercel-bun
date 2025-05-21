import { Lambda, type BuildV3 } from "@vercel/build-utils";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export const build: BuildV3 = async function ({ files, entrypoint, workPath }) {
  // Define the path to the output directory
  const outDir = join(workPath, ".vercel_output");

  // Ensure the output directory exists
  await mkdir(outDir, { recursive: true });

  // Write the entrypoint file to the output directory
  const entryFilePath = join(outDir, entrypoint);
  await writeFile(entryFilePath, files[entrypoint]?.toString() ?? "");

  // Create the Lambda function
  const lambda = new Lambda({
    files,
    handler: entrypoint,
    runtime: "provided.al2",
  });

  // Return the Lambda function
  return { output: lambda };
};
