"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000, // 5 seconds
      refetchInterval: 5 * 1000, // Auto-refetch every 5 seconds
    },
  },
});

type ProvidersParams = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersParams) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
