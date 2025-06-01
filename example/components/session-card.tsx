"use client";

import { Copy, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRedisEntries } from "@/hooks/use-redis-entries";
import { useSessionParam } from "@/hooks/use-session-param";
import { cn } from "@/lib/utils";

export function SessionCard() {
  // Get session ID
  const { sessionIdParam, setSessionIdParam } = useSessionParam();

  // State for the session ID
  const [sessionIdState, setSessionIdState] = useState(sessionIdParam);

  // Handle session ID change
  useEffect(() => {
    setSessionIdState(sessionIdParam);
  }, [sessionIdParam]);

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

  // Handle new session
  function handleNewSession() {
    const uuid = uuidv4();
    setSessionIdState(uuid);
    setSessionIdParam(uuid);
    toast.success("New session created!");
  }

  // Get current online count
  const { onlineCount } = useRedisEntries();

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
      <CardHeader className="flex flex-col w-full space-y-1">
        <div className="flex justify-between w-full">
          <CardTitle className="text-lg">Session</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNewSession}
            className="flex-shrink-0 cursor-pointer"
          >
            <Plus className="size-4 mr-1" />
            New
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Create a new session, join an existing one, or copy your session ID to
          share with others.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                onlineCount > 0 ? "bg-green-500" : "bg-muted-foreground"
              )}
            />
            <span>{onlineCount} online</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
