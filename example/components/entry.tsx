"use client";

import { Clock, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RedisEntry } from "@/lib/redis";

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

export function Entry({ entry, onDelete, isDeleting }: EntryProps) {
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
