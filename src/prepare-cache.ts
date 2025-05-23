import { glob, type PrepareCache } from "@vercel/build-utils";

export const prepareCache: PrepareCache = async function ({ workPath }) {
  return {
    ...(await glob("node_modules/**", workPath)),
  };
};
