"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRedisEntries } from "@/hooks/use-redis-entries";
import { useSessionParam } from "@/hooks/use-session-param";

export function SessionCard() {
  // State for the session ID
  const [sessionIdState, setSessionIdState] = useState("");

  // Session parameter management utils
  const { getSessionIdParam, setSessionIdParam } = useSessionParam();

  // Get the session ID param
  const sessionIdParam = getSessionIdParam();

  // Populate the state with the session ID param on mount
  useEffect(() => {
    // If the session ID param is not empty, set the state
    if (sessionIdParam) {
      setSessionIdState(sessionIdParam);
      return;
    }

    // Generate a new session ID and set the state and query parameter
    const newSessionId = uuidv4();
    setSessionIdState(newSessionId);
    setSessionIdParam(newSessionId);
  }, []);

  // Handle input change
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Update the state immediately, wait for the blur event to update the URL parameter
    setSessionIdState(e.target.value);
  }

  // Handle input blur
  function handleInputBlur() {
    // Trim the value when user finishes editing
    const trimmedValue = sessionIdState.trim();

    // Update the state and URL parameter
    setSessionIdState(trimmedValue);
    setSessionIdParam(trimmedValue);
  }

  // Handle key down on input
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      (e.target as HTMLInputElement).blur(); // Remove focus from input
    }
  }

  // Handle refresh
  function handleRefresh() {
    const uuid = uuidv4();
    setSessionIdState(uuid);
    setSessionIdParam(uuid);
    toast.success("Session ID refreshed!");
  }

  // Redis entries management utils (for updating the entries table on session ID changes)
  const { refresh } = useRedisEntries();

  // Update the entries table when the session ID changes
  useEffect(() => {
    refresh();
  }, [sessionIdParam]);

  // Handle copy
  async function handleCopy() {
    const currentSessionId = sessionIdState;
    if (!currentSessionId) {
      toast.error("No session ID to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(currentSessionId);
      toast.success("Session ID copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy session ID:", error);
      toast.error("Failed to copy session ID");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col w-full space-y-2">
        <div className="flex justify-between w-full">
          <CardTitle className="text-lg">Session</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex-shrink-0 cursor-pointer"
          >
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your unique session identifier. Use the refresh button to
          generate a new ID or copy the current one to share.
        </p>
      </CardHeader>
      <CardContent>
        <form className="flex gap-2 items-center">
          <Input
            value={sessionIdState}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder="Session ID..."
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-shrink-0 cursor-pointer"
          >
            <Copy className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
