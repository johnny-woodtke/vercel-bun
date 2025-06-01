"use client";

import { RefreshCw } from "lucide-react";

import { Entry } from "@/components/entry";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useRedisEntries } from "@/hooks/use-redis-entries";

export function EntriesTable() {
  const { entries, isFetching, error, deleteEntry, isDeletingEntry, refresh } =
    useRedisEntries();

  async function handleDeleteEntry(id: string) {
    try {
      await deleteEntry(id);
    } catch (error) {
      // Error is already handled in the hook
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Active Entries</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={refresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
      </Card>

      <div className="mt-4">
        {error ? (
          <div className="text-center py-8 text-destructive">
            Error loading entries: {error.message}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No entries found. Add a new entry or join a session to get started!
          </div>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => (
              <Entry
                key={entry.id}
                entry={entry}
                onDelete={handleDeleteEntry}
                isDeleting={isDeletingEntry}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
