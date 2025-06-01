"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { ENTRIES_REFETCH_INTERVAL_MS } from "@/lib/constants";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ENTRIES_REFETCH_INTERVAL_MS,
      refetchInterval: ENTRIES_REFETCH_INTERVAL_MS,
    },
  },
});

type ProvidersParams = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersParams) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
