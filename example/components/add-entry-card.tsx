"use client";

import { Plus, Upload, X, ImageIcon } from "lucide-react";
import { useState, useRef, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRedisEntries } from "@/hooks/use-redis-entries";

export function AddEntryCard() {
  const [newText, setNewText] = useState("");
  const [ttl, setTtl] = useState(120); // Default to 120 seconds
  const [ttlError, setTtlError] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addEntry, isAddingEntry } = useRedisEntries();

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

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

  function validateImageFile(file: File): string | null {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Please select a valid image file (JPEG, PNG, GIF, or WebP)";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "Image size must be less than 5MB";
    }
    return null;
  }

  function handleImageSelect(file: File) {
    const error = validateImageFile(file);
    if (error) {
      alert(error);
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }

  function removeImage() {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      await addEntry({ text: newText.trim(), ttl, image: selectedImage });
      setNewText("");
      setTtl(120); // Reset to default
      setTtlError("");
      removeImage();
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
            <Label htmlFor="image">Image (Optional)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-32 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={removeImage}
                      disabled={isAddingEntry}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">{selectedImage?.name}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Drop an image here, or{" "}
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-700"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAddingEntry}
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-gray-500">
                      JPEG, PNG, GIF, WebP • Max 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
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
