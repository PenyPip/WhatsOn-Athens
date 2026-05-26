"use client";

import { useMemo } from "react";
import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import { readRqBootstrapState } from "@/lib/rqBootstrap";
import { parseDehydratedState } from "@/lib/serializeDehydratedState";

type SpaRootProps = {
  /** Pathname χωρίς query (π.χ. `/movies/foo`). */
  ssrPath: string;
  /** JSON string από server — serializable RSC prop (όχι αντικείμενο). */
  bootstrapJson?: string;
  suppressHydrationWarning?: boolean;
};

/** Client boundary — SSR στο build με prefetch + MemoryRouter μέχρι hydration. */
export default function SpaRoot({ ssrPath, bootstrapJson, suppressHydrationWarning }: SpaRootProps) {
  const dehydratedState = useMemo(
    () => parseDehydratedState(bootstrapJson) ?? readRqBootstrapState(),
    [bootstrapJson],
  );

  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      <SpaProviders dehydratedState={dehydratedState}>
        <App ssrPath={ssrPath} />
      </SpaProviders>
    </div>
  );
}
