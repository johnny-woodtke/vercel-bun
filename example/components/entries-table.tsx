"use client";

import { RefreshCw, Trash2 } from "lucide-react";

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

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const remaining = Math.max(
      0,
      Math.floor((expires.getTime() - now.getTime()) / 1000)
    );
    return remaining;
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteEntry(id);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
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
          <div className="text-center py-8 text-gray-500">
            Loading entries...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error loading entries: {error.message}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No entries found. Add some text above to get started!
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Text</TableHead>
                  <TableHead className="w-32">Created</TableHead>
                  <TableHead className="w-32">Expires</TableHead>
                  <TableHead className="w-24">TTL</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry: RedisEntry) => {
                  const timeRemaining = getTimeRemaining(entry.expiresAt);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium max-w-md">
                        <div className="truncate">{entry.text}</div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatTime(entry.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatTime(entry.expiresAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={
                            timeRemaining < 30
                              ? "text-red-600 font-medium"
                              : "text-green-600"
                          }
                        >
                          {timeRemaining}s
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={isDeletingEntry}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
