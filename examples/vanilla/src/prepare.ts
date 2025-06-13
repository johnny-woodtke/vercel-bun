// Get the URL/endpoint to warm up
const baseUrl =
  Bun.env.BENCH_API_DOMAIN || "https://vercel-bun-bench.vercel.app";
const endpoint = Bun.env.ENDPOINT || "/api/bun";

// Warm up the endpoint for the benchmark tests
async function prepare() {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
  });
  if (res.status !== 200) {
    throw new Error(`Failed to prepare ${baseUrl}${endpoint}: ${res.status}`);
  }
}

prepare()
  .then(() => {
    console.log(`${baseUrl}${endpoint} prepared`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
