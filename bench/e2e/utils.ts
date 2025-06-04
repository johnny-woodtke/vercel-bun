export function getApiClient() {
  const domain = Bun.env.E2E_BENCH_API_DOMAIN;
  if (!domain) {
    throw new Error("E2E_BENCH_API_DOMAIN environment variable is required");
  }

  return (path: `/api/${string}`, opts?: RequestInit) =>
    fetch(`${domain}${path}`, opts);
}
