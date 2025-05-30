"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRedisEntries } from "@/hooks/use-redis-entries";
import type { RedisEntry } from "@/lib/redis";

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

  function getTimeRemaining(expiresAt: string) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const remaining = Math.max(
      0,
      Math.floor((expires.getTime() - now.getTime()) / 1000)
    );
    return remaining;
  }

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
          <div className="rounded-md border">
            <Table>
              <TableBody>
                {entries.map((entry: RedisEntry) => {
                  const timeRemaining = getTimeRemaining(entry.expiresAt);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium w-full pl-4 py-4">
                        <div className="flex flex-col items-start space-y-4">
                          {entry.imageUrl && (
                            <div className="relative w-full flex justify-center items-center">
                              <Image
                                src={entry.imageUrl}
                                alt="Entry image"
                                width={0}
                                height={0}
                                className="w-[80%] h-auto object-contain rounded-xl"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            </div>
                          )}
                          <div className="max-w-xs">
                            <div className="break-words">{entry.text}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm w-16">
                        <span
                          className={
                            timeRemaining < 30
                              ? "text-destructive font-medium"
                              : "text-green-600"
                          }
                        >
                          {timeRemaining}s
                        </span>
                      </TableCell>
                      <TableCell className="w-16">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={isDeletingEntry}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
