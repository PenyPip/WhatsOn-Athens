"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
type SpaProvidersProps = {
  children: React.ReactNode;
  dehydratedState?: DehydratedState;
};

export default function SpaProviders({ children, dehydratedState }: SpaProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 1_800_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <AuthProvider>{children}</AuthProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
