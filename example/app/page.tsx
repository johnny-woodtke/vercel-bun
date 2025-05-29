"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const [newText, setNewText] = useState("");
  const [newSessionId, setNewSessionId] = useState("");
  const [isEditingSession, setIsEditingSession] = useState(false);

  const queryClient = useQueryClient();

  // Queries
  const entriesQuery = useQuery({
    queryKey: ["entries"],
    queryFn: async () => {
      const response = await eden.api.redis.entries.get();
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error("Failed to load entries");
    },
  });

  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await eden.api.redis.stats.get();
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error("Failed to load stats");
    },
  });

  // Mutations
  const updateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await eden.api.session.post({ sessionId });
      if (!response.data) {
        throw new Error("Failed to update session");
      }
      return response.data;
    },
    onSuccess: async () => {
      setNewSessionId("");
      // Refetch both queries and wait for completion
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["entries"] }),
        queryClient.refetchQueries({ queryKey: ["stats"] }),
      ]);
      // Only switch out of edit mode after the queries have been refetched
      setIsEditingSession(false);
      toast.success("Session ID updated successfully!");
    },
    onError: (error) => {
      console.error("Failed to update session:", error);
      toast.error("Failed to update session ID");
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await eden.api.redis.entries.post({ text });
      if (!response.data?.success) {
        throw new Error("Failed to add entry");
      }
      return response.data;
    },
    onSuccess: () => {
      setNewText("");
      // Invalidate and refetch both queries
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      console.error("Failed to add entry:", error);
      toast.error("Failed to add entry");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await eden.api.redis.entries({ id }).delete();
      if (!response.data?.success) {
        throw new Error("Failed to delete entry");
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch both queries
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
    },
  });

  // Event handlers
  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionId.trim()) return;
    updateSessionMutation.mutate(newSessionId.trim());
  };

  const handleCopySessionId = async () => {
    if (!statsQuery.data?.sessionId) {
      toast.error("No session ID to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(statsQuery.data.sessionId);
      toast.success("Session ID copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy session ID:", error);
      toast.error("Failed to copy session ID");
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    addEntryMutation.mutate(newText.trim());
  };

  const handleDeleteEntry = async (id: string) => {
    deleteEntryMutation.mutate(id);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["entries"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
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

  const entries = entriesQuery.data || [];
  const stats = statsQuery.data;
  const isRefreshing = entriesQuery.isFetching || statsQuery.isFetching;

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
                    disabled={updateSessionMutation.isPending}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={
                      updateSessionMutation.isPending || !newSessionId.trim()
                    }
                    variant="outline"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {updateSessionMutation.isPending ? "Updating..." : "Update"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingSession(false);
                      setNewSessionId("");
                    }}
                    disabled={updateSessionMutation.isPending}
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
                disabled={addEntryMutation.isPending}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={addEntryMutation.isPending || !newText.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                {addEntryMutation.isPending ? "Adding..." : "Add"}
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
            {entriesQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading entries...
              </div>
            ) : entriesQuery.error ? (
              <div className="text-center py-8 text-red-500">
                Error loading entries: {entriesQuery.error.message}
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
                              disabled={deleteEntryMutation.isPending}
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
