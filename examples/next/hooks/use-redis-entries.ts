"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSessionParam } from "@/hooks/use-session-param";
import { eden } from "@/lib/eden";
import { getEntriesQueryKey } from "@/lib/tanstack";

export function useRedisEntries() {
  // Query client
  const queryClient = useQueryClient();

  // Get session ID from URL parameters
  const { sessionIdParam: sessionId } = useSessionParam();

  // Query to fetch entries
  const entriesQuery = useQuery({
    queryKey: getEntriesQueryKey(sessionId),
    queryFn: async () => {
      const res = await eden.api.redis.entries.get({
        query: { sessionId },
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
  });

  // Mutation to add an entry
  const addEntryMutation = useMutation({
    mutationFn: async ({
      text,
      ttl,
      image,
    }: {
      text: string;
      ttl: number;
      image?: File | null;
    }) => {
      const res = await eden.api.redis.entries.post(
        { text, ttl, image },
        { query: { sessionId } }
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
      const res = await eden.api.redis
        .entries({ entryId: id })
        .delete(undefined, {
          query: { sessionId },
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
    queryClient.invalidateQueries({ queryKey: getEntriesQueryKey(sessionId) });
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
