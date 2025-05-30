export function Header() {
  return (
    <header className="w-full bg-card border-b border-border shadow-sm">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-center text-card-foreground">
          Bun Redis Client Demo
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          Session-scoped text entries with custom TTL (10-300 seconds)
        </p>
      </div>
    </header>
  );
}
