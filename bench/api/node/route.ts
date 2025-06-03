export async function POST(req: Request): Promise<Response> {
  return new Response(`Hello from node@${process.version}`);
}
