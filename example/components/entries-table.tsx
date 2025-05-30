"use client";

import { RefreshCw } from "lucide-react";

import { Entry } from "@/components/entry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRedisEntries } from "@/hooks/use-redis-entries";

export function EntriesTable() {
  const {
    entries,
    isLoading,
    isFetching,
    error,
    deleteEntry,
    isDeletingEntry,
    refresh,
  } = useRedisEntries();

  async function handleDeleteEntry(id: string) {
    try {
      await deleteEntry(id);
    } catch (error) {
      // Error is already handled in the hook
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Active Entries</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isFetching}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading entries...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Error loading entries: {error.message}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No entries found. Add some text above to get started!
          </div>
        ) : (
          <div className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
