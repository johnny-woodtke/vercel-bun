import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets the Vercel environment:
 * - local = undefined
 * - development = development
 * - preview = preview
 * - production = production
 */
export function getVercelEnv() {
  return (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV) as
    | undefined
    | "development"
    | "preview"
    | "production";
}

/**
 * Gets the API host:
 * - local = http://localhost:3000
 * - development = https://[generated-id].vercel.app
 * - preview = https://[generated-id].vercel.app
 * - production = https://[generated-id].vercel.app
 */
export function getApiHost(): `https://${string}` | `http://${string}` {
  const env = getVercelEnv();

  if (!env) {
    return `http://localhost:${
      process.env.NEXT_PUBLIC_API_PORT || process.env.API_PORT || 3000
    }`;
  }

  if (env === "production") {
    return `https://${
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL
    }`;
  }

  return `https://${
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_BRANCH_URL
  }`;
}
