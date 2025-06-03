export default async function handler(req: Request): Promise<Response> {
  return new Response(`Hello from bun@${Bun.version}`);
}
