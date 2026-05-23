"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import { readRqBootstrapState } from "@/lib/rqBootstrap";

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
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [bootstrapState] = useState(() => dehydratedState ?? readRqBootstrapState());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={bootstrapState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
