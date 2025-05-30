"use client";

import { Clock, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRedisEntries } from "@/hooks/use-redis-entries";
import type { RedisEntry } from "@/lib/redis";
import { useEffect, useState } from "react";

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
            {entries.map((entry: RedisEntry) => (
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

function getTimeRemaining(expiresAt: string) {
  const now = new Date();
  const expires = new Date(expiresAt);
  const remaining = Math.max(
    0,
    Math.floor((expires.getTime() - now.getTime()) / 1000)
  );
  return remaining;
}

function formatTimeRemaining(seconds: number) {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

type EntryProps = {
  entry: RedisEntry;
  onDelete: (id: string) => void;
  isDeleting: boolean;
};

function Entry({ entry, onDelete, isDeleting }: EntryProps) {
  // Initialize the time remaining
  const [timeRemaining, setTimeRemaining] = useState(
    getTimeRemaining(entry.expiresAt)
  );

  // Update the time remaining every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(entry.expiresAt));
    }, 500);

    return () => clearInterval(interval);
  }, [entry.expiresAt]);

  // Check if the entry is expiring soon
  const isExpiringSoon = timeRemaining < 30;

  return (
    <Card className="relative overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-colors">
      <CardContent>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 space-y-3">
            {entry.imageUrl && (
              <div className="w-full max-w-sm">
                <AspectRatio ratio={16 / 9}>
                  <Image
                    src={entry.imageUrl}
                    alt="Entry image"
                    fill
                    className="rounded-lg object-cover shadow-md"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </AspectRatio>
              </div>
            )}

            <p className="text-sm text-foreground leading-relaxed break-words">
              {entry.text}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={isExpiringSoon ? "destructive" : "secondary"}
              className="text-xs"
            >
              <Clock className="w-3 h-3 mr-1" />
              {formatTimeRemaining(timeRemaining)}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(entry.id)}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
