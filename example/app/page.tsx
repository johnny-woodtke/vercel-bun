import { Header } from "@/components/header";
import { SessionCard } from "@/components/session-card";
import { AddEntryCard } from "@/components/add-entry-card";
import { EntriesTable } from "@/components/entries-table";
import { Footer } from "@/components/footer";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Suspense>
            <SessionCard />
            <AddEntryCard />
            <EntriesTable />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
