"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
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
            staleTime: 300_000,
            gcTime: 1_800_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
