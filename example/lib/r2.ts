import { S3Client } from "bun";

const config = {
  accessKeyId: Bun.env.NEXT_PUBLIC_R2_ACCESS_KEY,
  secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY,
  bucket: Bun.env.NEXT_PUBLIC_R2_BUCKET,
  endpoint: Bun.env.NEXT_PUBLIC_R2_ENDPOINT,
};

console.log("config", config);

export const r2 = new S3Client({
  accessKeyId: Bun.env.NEXT_PUBLIC_R2_ACCESS_KEY,
  secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY,
  bucket: Bun.env.NEXT_PUBLIC_R2_BUCKET,
  endpoint: Bun.env.NEXT_PUBLIC_R2_ENDPOINT,
});

export function getImageUrl<TFileName extends string>(fileName: TFileName) {
  return `https://${Bun.env.NEXT_PUBLIC_R2_HOST!}/${fileName}` as const;
}
