"use client";

import { debounce } from "lodash";
import { Copy, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

  // Redis entries management utils (for updating the entries table on session ID changes)
  const { refresh } = useRedisEntries();

  // Set the session ID state and query parameter
  function setSessionIdStateAndParam(value: string) {
    setSessionIdState(value);
    setSessionIdParam(value);
  }

  // Manage the session ID state and query parameter
  const sessionIdParam = getSessionIdParam();
  useEffect(() => {
    // If the state and the param are the same, return
    if (sessionIdState === sessionIdParam) {
      return;
    }

    // If the session ID exists, set the state
    if (sessionIdParam) {
      setSessionIdState(sessionIdParam);
      return;
    }

    // Generate a new session ID and set the state and query parameter
    const newSessionId = crypto.randomUUID();
    setSessionIdStateAndParam(newSessionId);
  }, [sessionIdParam]);

  // Create a debounced version of the refresh function
  const refreshEntries = useCallback(
    debounce(() => {
      refresh();
    }, 500),
    []
  );

  // Effect to refresh Redis entries when session ID changes
  useEffect(() => {
    // Skip the initial render or when sessionIdState is empty
    if (!sessionIdState) return;

    // Call the debounced refresh function
    refreshEntries();

    // Cleanup function to cancel pending debounced calls
    return () => {
      refreshEntries.cancel();
    };
  }, [sessionIdState, refreshEntries]);

  // Handle input change
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSessionIdStateAndParam(e.target.value);
  }

  // Handle input blur
  function handleInputBlur() {
    // Trim the value when user finishes editing
    const trimmedValue = sessionIdState.trim();
    if (trimmedValue !== sessionIdState) {
      setSessionIdStateAndParam(trimmedValue);
    }
  }

  // Handle refresh
  function handleRefresh() {
    setSessionIdStateAndParam(crypto.randomUUID());
    toast.success("Session ID refreshed!");
  }

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
            className="flex-shrink-0"
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
            placeholder="Session ID..."
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            <Copy className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
