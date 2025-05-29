import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Header() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Redis Demo
        </CardTitle>
        <CardDescription className="text-center">
          Session-scoped text entries with 120-second TTL
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
