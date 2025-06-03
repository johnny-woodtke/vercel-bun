import { performWorkload } from "../../lib/utils";

export async function POST(req: Request): Promise<Response> {
  const result = performWorkload();
  return new Response(JSON.stringify({ result }));
}
