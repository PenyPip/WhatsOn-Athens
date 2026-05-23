"use client";

import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import type { DehydratedState } from "@tanstack/react-query";

type SpaRootProps = {
  /** Pathname χωρίς query (π.χ. `/movies/foo`). */
  ssrPath: string;
  dehydratedState?: DehydratedState;
  suppressHydrationWarning?: boolean;
};

/** Client boundary — SSR στο build με prefetch + MemoryRouter μέχρι hydration. */
export default function SpaRoot({ ssrPath, dehydratedState, suppressHydrationWarning }: SpaRootProps) {
  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      <SpaProviders dehydratedState={dehydratedState}>
        <App ssrPath={ssrPath} />
      </SpaProviders>
    </div>
  );
}
