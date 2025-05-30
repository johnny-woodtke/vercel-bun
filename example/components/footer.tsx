import { Card, CardContent } from "@/components/ui/card";

export function Footer() {
  return (
    <Card>
      <CardContent>
        <div className="text-center text-sm text-gray-500">
          <p>Built with Bun, Elysia, and Next.js. Deployed on Vercel.</p>
        </div>
      </CardContent>
    </Card>
  );
}
