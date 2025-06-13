"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRedisEntries } from "@/hooks/use-redis-entries";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MAX_TEXT_LENGTH,
  MAX_TTL,
  MIN_TTL,
} from "@/lib/constants";

// Custom validation for File objects
const fileSchema = z
  .instanceof(File)
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Please select a valid image file (JPEG, PNG, GIF, or WebP)"
  )
  .refine(
    (file) => file.size <= MAX_IMAGE_SIZE,
    "Image size must be less than 5MB"
  );

// Form schema with conditional validation
const formSchema = z
  .object({
    text: z
      .string()
      .max(
        MAX_TEXT_LENGTH,
        `Text must be less than ${MAX_TEXT_LENGTH} characters`
      ),
    ttl: z
      .number()
      .min(MIN_TTL, `TTL must be at least ${MIN_TTL} seconds`)
      .max(MAX_TTL, `TTL must be at most ${MAX_TTL} seconds`),
    image: z.optional(fileSchema),
  })
  .refine((data) => data.text.trim().length > 0 || data.image, {
    message: "Either text or image is required",
    path: ["text"], // This will show the error on the text field
  });

type FormValues = z.infer<typeof formSchema>;

export function AddEntryCard() {
  // Redis entries management utils
  const { addEntry, isAddingEntry } = useRedisEntries();

  // Form management utils
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: "",
      ttl: 120,
      image: undefined,
    },
  });

  // Watch the image field
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchedImage = form.watch("image");

  // Handle image preview when image changes
  useEffect(() => {
    if (watchedImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(watchedImage);
    } else {
      setImagePreview(null);
    }
  }, [watchedImage]);

  function handleImageSelect(file: File) {
    form.setValue("image", file);
    form.clearErrors("image");
    // Clear text error if we now have an image (since either is required)
    if (form.getValues("text").trim().length === 0) {
      form.clearErrors("text");
    }
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
    form.setValue("image", undefined);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      await addEntry({
        text: values.text.trim(),
        ttl: values.ttl,
        image: values.image || null,
      });

      // Reset form
      form.reset();
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      // Error is already handled in the hook
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add New Entry</CardTitle>
        <p className="text-sm text-muted-foreground">
          Store temporary text and image entries in Redis with automatic
          expiration. Perfect for sharing quick notes, snippets, or images that
          don't need permanent storage.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter text to store in Redis..."
                      maxLength={1000}
                      disabled={isAddingEntry}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Clear text error if we now have text (since either is required)
                        if (e.target.value.trim().length > 0) {
                          form.clearErrors("text");
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>Enter text to store</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
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
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 cursor-pointer"
                              onClick={removeImage}
                              disabled={isAddingEntry}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600">
                            {watchedImage?.name}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Drop an image here, or{" "}
                              <button
                                type="button"
                                className="text-blue-600 hover:text-blue-700 underline cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAddingEntry}
                              >
                                browse
                              </button>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              JPEG, PNG, GIF, WebP • Max 5MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={isAddingEntry}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ttl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time to live (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="120"
                      min={10}
                      max={300}
                      disabled={isAddingEntry}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a value between 10 and 300 seconds
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isAddingEntry}
              className="w-full cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isAddingEntry ? "Adding..." : "Add Entry"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
