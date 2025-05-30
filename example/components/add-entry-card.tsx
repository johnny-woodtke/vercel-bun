"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRedisEntries } from "@/hooks/use-redis-entries";

export function AddEntryCard() {
  const [newText, setNewText] = useState("");
  const [ttl, setTtl] = useState(120); // Default to 120 seconds
  const [ttlError, setTtlError] = useState("");
  const { addEntry, isAddingEntry } = useRedisEntries();

  function validateTtl(value: number) {
    if (value < 10) {
      return "TTL must be at least 10 seconds";
    }
    if (value > 300) {
      return "TTL must be at most 300 seconds (5 minutes)";
    }
    return "";
  }

  function handleTtlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.target.value) || 0;
    setTtl(value);
    setTtlError(validateTtl(value));
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;

    const ttlValidationError = validateTtl(ttl);
    if (ttlValidationError) {
      setTtlError(ttlValidationError);
      return;
    }

    try {
      await addEntry({ text: newText.trim(), ttl });
      setNewText("");
      setTtl(120); // Reset to default
      setTtlError("");
    } catch (error) {
      // Error is already handled in the hook
    }
  }

  const isFormValid = newText.trim() && !ttlError && ttl >= 10 && ttl <= 300;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add New Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddEntry} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Text</Label>
            <Input
              id="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Enter text to store in Redis..."
              maxLength={1000}
              disabled={isAddingEntry}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ttl">TTL (Time to Live in seconds)</Label>
            <Input
              id="ttl"
              type="number"
              value={ttl}
              onChange={handleTtlChange}
              placeholder="120"
              min={10}
              max={300}
              disabled={isAddingEntry}
              className={ttlError ? "border-red-500" : ""}
            />
            {ttlError ? (
              <p className="text-sm text-red-600">{ttlError}</p>
            ) : (
              <p className="text-sm text-gray-500">
                Enter a value between 10 and 300 seconds (5 minutes)
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isAddingEntry || !isFormValid}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isAddingEntry ? "Adding..." : "Add Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
