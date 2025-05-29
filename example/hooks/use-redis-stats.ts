import { useQuery } from "@tanstack/react-query";

import { eden } from "@/lib/eden";

export interface Stats {
  sessionId: string;
  entryCount: number;
  ttlSeconds: number;
}

export function useRedisStats() {
  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await eden.api.redis.stats.get();
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error("Failed to load stats");
    },
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    isFetching: statsQuery.isFetching,
    error: statsQuery.error,
  };
}
