import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { eden } from "@/lib/eden";

export function useSession() {
  const queryClient = useQueryClient();

  const updateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await eden.api.session.post({ sessionId });
      if (!response.data) {
        throw new Error("Failed to update session");
      }
      return response.data;
    },
    onSuccess: async () => {
      // Refetch both queries and wait for completion
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["entries"] }),
        queryClient.refetchQueries({ queryKey: ["stats"] }),
      ]);
      toast.success("Session ID updated successfully!");
    },
    onError: (error) => {
      console.error("Failed to update session:", error);
      toast.error("Failed to update session ID");
    },
  });

  return {
    updateSession: updateSessionMutation.mutateAsync,
    isUpdatingSession: updateSessionMutation.isPending,
  };
}
