"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { SESSION_ID_PARAM_NAME } from "@/lib/constants";
import { eden } from "@/lib/eden";

export function useRedisEntries() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Get session ID from URL parameters
  const sessionId = searchParams.get(SESSION_ID_PARAM_NAME);

  const entriesQuery = useQuery({
    queryKey: ["entries", sessionId],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error("Session ID is required");
      }

      const response = await eden.api.redis.entries.get({
        query: { [SESSION_ID_PARAM_NAME]: sessionId },
      });
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error("Failed to load entries");
    },
    enabled: !!sessionId, // Only run query if session ID exists
  });

  const addEntryMutation = useMutation({
    mutationFn: async ({
      text,
      ttl,
      image,
    }: {
      text: string;
      ttl?: number;
      image?: File | null;
    }) => {
      if (!sessionId) {
        throw new Error("Session ID is required");
      }

      const response = await eden.api.redis.entries.post(
        {
          text,
          ttl,
          image: image ?? undefined,
        },
        {
          query: { [SESSION_ID_PARAM_NAME]: sessionId },
        }
      );

      const data = response.data;
      if (!data?.success) {
        throw new Error(data?.error || "Failed to add entry");
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch both queries
      queryClient.invalidateQueries({ queryKey: ["entries", sessionId] });
      toast.success("Entry added successfully!");
    },
    onError: (error) => {
      console.error("Failed to add entry:", error);
      toast.error("Failed to add entry");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!sessionId) {
        throw new Error("Session ID is required");
      }

      const response = await eden.api.redis.entries({ id }).delete(undefined, {
        query: { [SESSION_ID_PARAM_NAME]: sessionId },
      });
      if (!response.data?.success) {
        throw new Error("Failed to delete entry");
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch both queries
      queryClient.invalidateQueries({ queryKey: ["entries", sessionId] });
      toast.success("Entry deleted successfully!");
    },
    onError: (error) => {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["entries", sessionId] });
  }

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    isFetching: entriesQuery.isFetching,
    error: entriesQuery.error,
    addEntry: addEntryMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutateAsync,
    isAddingEntry: addEntryMutation.isPending,
    isDeletingEntry: deleteEntryMutation.isPending,
    refresh,
  };
}
