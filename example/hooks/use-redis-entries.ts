import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { eden } from "@/lib/eden";

export function useRedisEntries() {
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ["entries"],
    queryFn: async () => {
      const response = await eden.api.redis.entries.get();
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error("Failed to load entries");
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await eden.api.redis.entries.post({ text });
      if (!response.data?.success) {
        throw new Error("Failed to add entry");
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch both queries
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Entry added successfully!");
    },
    onError: (error) => {
      console.error("Failed to add entry:", error);
      toast.error("Failed to add entry");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await eden.api.redis.entries({ id }).delete();
      if (!response.data?.success) {
        throw new Error("Failed to delete entry");
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch both queries
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Entry deleted successfully!");
    },
    onError: (error) => {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["entries"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

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
