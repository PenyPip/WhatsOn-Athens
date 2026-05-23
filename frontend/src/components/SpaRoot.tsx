"use client";

import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import type { DehydratedState } from "@tanstack/react-query";

type SpaRootProps = {
  /** Pathname χωρίς query (π.χ. `/movies/foo`). */
  ssrPath: string;
  dehydratedState?: DehydratedState;
};

/** Client boundary — SSR στο build με prefetch + MemoryRouter μέχρι hydration. */
export default function SpaRoot({ ssrPath, dehydratedState }: SpaRootProps) {
  return (
    <SpaProviders dehydratedState={dehydratedState}>
      <App ssrPath={ssrPath} />
    </SpaProviders>
  );
}
