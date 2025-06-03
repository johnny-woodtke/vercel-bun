import { performWorkload } from "../../lib/utils";

export default async function handler(req: Request): Promise<Response> {
  const result = performWorkload();
  return new Response(JSON.stringify({ result }));
}
