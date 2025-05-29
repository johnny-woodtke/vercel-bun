"use client";

import { Copy, Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eden } from "@/lib/eden";
import type { RedisEntry } from "@/lib/redis";

interface Stats {
  sessionId: string;
  entryCount: number;
  ttlSeconds: number;
}

export default function Home() {
  const [entries, setEntries] = useState<RedisEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [newText, setNewText] = useState("");
  const [newSessionId, setNewSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  const [isEditingSession, setIsEditingSession] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const response = await eden.api.redis.entries.get();
      if (response.data?.success) {
        setEntries(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load entries:", error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await eden.api.redis.stats.get();
      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionId.trim() || isUpdatingSession) return;

    setIsUpdatingSession(true);
    try {
      const response = await eden.api.session.post({
        sessionId: newSessionId.trim(),
      });
      if (response.data) {
        setNewSessionId("");
        setIsEditingSession(false);
        // Refresh stats and entries after session update
        await Promise.all([loadEntries(), loadStats()]);
        toast.success("Session ID updated successfully!");
      }
    } catch (error) {
      console.error("Failed to update session:", error);
      toast.error("Failed to update session ID");
    } finally {
      setIsUpdatingSession(false);
    }
  };

  const handleCopySessionId = async () => {
    if (!stats?.sessionId) {
      toast.error("No session ID to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(stats.sessionId);
      toast.success("Session ID copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy session ID:", error);
      toast.error("Failed to copy session ID");
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await eden.api.redis.entries.post({
        text: newText.trim(),
      });
      if (response.data?.success) {
        setNewText("");
        await Promise.all([loadEntries(), loadStats()]);
      }
    } catch (error) {
      console.error("Failed to add entry:", error);
      toast.error("Failed to add entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const response = await eden.api.redis.entries({ id }).delete();
      if (response.data?.success) {
        await Promise.all([loadEntries(), loadStats()]);
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadEntries(), loadStats()]);
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  useEffect(() => {
    loadEntries();
    loadStats();
  }, [loadEntries, loadStats]);

  // Auto-refresh entries every 5 seconds to show TTL updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadEntries();
      loadStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadEntries, loadStats]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
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

        {/* Stats Card - Always shows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {isEditingSession ? "Update Session ID" : "Session Info"}
            </CardTitle>
            {!isEditingSession && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingSession(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Update
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingSession ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Change your session ID to start fresh or access a different
                  session
                </p>
                <form onSubmit={handleUpdateSession} className="flex gap-2">
                  <Input
                    value={newSessionId}
                    onChange={(e) => setNewSessionId(e.target.value)}
                    placeholder="Enter new session ID..."
                    disabled={isUpdatingSession}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isUpdatingSession || !newSessionId.trim()}
                    variant="outline"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isUpdatingSession ? "Updating..." : "Update"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingSession(false);
                      setNewSessionId("");
                    }}
                    disabled={isUpdatingSession}
                  >
                    Cancel
                  </Button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                <div className="md:col-span-3">
                  <span className="font-medium">Session ID:</span>
                  <div className="flex flex-1 items-center gap-2 mt-1">
                    <p className="text-gray-600 font-mono break-all">
                      {stats?.sessionId || "--"}
                    </p>
                    {stats?.sessionId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySessionId}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        title="Copy session ID"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-medium">Active Entries:</span>
                  <p className=" text-gray-600">{stats?.entryCount ?? "--"}</p>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-medium">TTL:</span>
                  <p className=" text-gray-600">
                    {stats?.ttlSeconds ? `${stats.ttlSeconds} seconds` : "--"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEntry} className="flex gap-2">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Enter text to store in Redis..."
                maxLength={1000}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !newText.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                {isLoading ? "Adding..." : "Add"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Active Entries</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
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
                    {entries.map((entry) => {
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

        {/* Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-500">
              <p>Built with Next.js 15, Elysia, Bun Runtime, and Redis</p>
              <p className="mt-1">
                Entries automatically expire after 120 seconds • Table updates
                every 5 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
