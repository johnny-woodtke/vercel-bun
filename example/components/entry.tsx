"use client";

import { Clock, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

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
        <div className="flex flex-col space-y-4 w-full">
          {/* Time remaining and delete button row */}
          <div className="flex justify-between">
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

          {/* Text */}
          {entry.text && (
            <p className="pl-1 text-foreground leading-relaxed break-words">
              {entry.text}
            </p>
          )}

          {/* Image */}
          {entry.imageUrl && (
            <div className="relative flex w-full">
              <Image
                src={entry.imageUrl}
                alt="Entry image"
                width={800}
                height={600}
                className="w-full h-auto object-contain rounded-md shadow-md"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
