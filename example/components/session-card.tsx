"use client";

import { Copy, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";
import { useRedisStats, type Stats } from "@/hooks/use-redis-stats";

export function SessionCard() {
  const [newSessionId, setNewSessionId] = useState("");
  const [isEditingSession, setIsEditingSession] = useState(false);

  const { stats } = useRedisStats();
  const { updateSession, isUpdatingSession } = useSession();

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionId.trim()) return;

    try {
      await updateSession(newSessionId.trim());
      setNewSessionId("");
      setIsEditingSession(false);
    } catch (error) {
      // Error is already handled in the hook
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

  return (
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
  );
}
