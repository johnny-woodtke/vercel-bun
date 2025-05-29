"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRedisEntries } from "@/hooks/use-redis-entries";

export function AddEntryCard() {
  const [newText, setNewText] = useState("");
  const { addEntry, isAddingEntry } = useRedisEntries();

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      await addEntry(newText.trim());
      setNewText("");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  return (
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
            disabled={isAddingEntry}
            className="flex-1"
          />
          <Button type="submit" disabled={isAddingEntry || !newText.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            {isAddingEntry ? "Adding..." : "Add"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
