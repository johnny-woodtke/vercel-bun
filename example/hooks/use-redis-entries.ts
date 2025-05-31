"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { SESSION_ID_PARAM_NAME } from "@/lib/constants";
import { eden } from "@/lib/eden";

export function useRedisEntries() {
  // Query client
  const queryClient = useQueryClient();

  // Get session ID from URL parameters
  const searchParams = useSearchParams();
  const sessionId = searchParams.get(SESSION_ID_PARAM_NAME);

  // Query to fetch entries
  const entriesQuery = useQuery({
    queryKey: ["entries", sessionId],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error("Session ID is required");
      }

      const res = await eden.api.redis.entries.get({
        query: { [SESSION_ID_PARAM_NAME]: sessionId },
      });

      if (res.data) {
        return res.data;
      }

      throw new Error(
        "error" in res.error.value
          ? res.error.value.error
          : "Failed to load entries"
      );
    },
    enabled: !!sessionId, // Only run query if session ID exists
  });

  // Mutation to add an entry
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

      const res = await eden.api.redis.entries.post(
        { text, ttl, image },
        { query: { [SESSION_ID_PARAM_NAME]: sessionId } }
      );

      if (res.data) {
        return res.data;
      }

      throw new Error(
        "error" in res.error.value
          ? res.error.value.error
          : "Failed to add entry"
      );
    },
    onSuccess: () => {
      refresh();
      toast.success("Entry added successfully!");
    },
    onError: (error) => {
      console.error("Failed to add entry:", error);
      toast.error("Failed to add entry");
    },
  });

  // Mutation to delete an entry
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!sessionId) {
        throw new Error("Session ID is required");
      }

      const res = await eden.api.redis.entries({ id }).delete(undefined, {
        query: { [SESSION_ID_PARAM_NAME]: sessionId },
      });

      if (res.data) {
        return res.data;
      }

      throw new Error(
        "error" in res.error.value
          ? res.error.value.error
          : "Failed to delete entry"
      );
    },
    onSuccess: () => {
      refresh();
      toast.success("Entry deleted successfully!");
    },
    onError: (error) => {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
    },
  });

  // Refresh the entries query
  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["entries", sessionId] });
  }

  return {
    entries: entriesQuery.data?.data || [],
    onlineCount: entriesQuery.data?.onlineCount || 0,
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
