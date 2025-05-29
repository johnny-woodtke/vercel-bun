import { Card, CardContent } from "@/components/ui/card";

export function Footer() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center text-sm text-gray-500">
          <p>Built with Next.js, Bun, and Elysia. Deployed on Vercel.</p>
          <p className="mt-1">
            Entries automatically expire after 120 seconds • Table updates every
            5 seconds
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
