export async function POST(req: Request): Promise<Response> {
  const arr = Array.from({ length: 100_000 }, () =>
    Math.floor(Math.random() * 100)
  );

  const result = arr
    .filter((x) => x % 2 === 0)
    .map((x) => ({ value: x * 3 }))
    .reduce((acc, curr) => acc + curr.value, 0);

  return new Response(JSON.stringify({ result }));
}
