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
  /** Αρχική: main επικαλύπτει το #home-hero-slot (ίδιο ύψος, χωρίς CLS). */
  homeMainOverlap?: boolean;
  suppressHydrationWarning?: boolean;
};

/** Client boundary — SSR στο build με prefetch + MemoryRouter μέχρι hydration. */
export default function SpaRoot({ ssrPath, bootstrapJson, homeMainOverlap, suppressHydrationWarning }: SpaRootProps) {
  const dehydratedState = useMemo(
    () => parseDehydratedState(bootstrapJson) ?? readRqBootstrapState(),
    [bootstrapJson],
  );

  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      <SpaProviders dehydratedState={dehydratedState}>
        <App ssrPath={ssrPath} homeMainOverlap={homeMainOverlap} />
      </SpaProviders>
    </div>
  );
}
