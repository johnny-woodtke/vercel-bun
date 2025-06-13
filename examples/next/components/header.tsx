import { ModeToggle } from "@/components/ui/mode-toggle";

export function Header() {
  return (
    <header className="w-full bg-card border-b border-border shadow-sm">
      <div className="max-w-4xl mx-auto py-8 px-4 relative">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <h1 className="text-2xl font-bold text-center text-card-foreground">
          Bun Runtime Demo
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          Store session-scoped data with Redis and handle file uploads with
          S3—all powered by Bun's native APIs.
        </p>
      </div>
    </header>
  );
}
