"use client";

import { useMemo } from "react";
import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import { readRqBootstrapState } from "@/lib/rqBootstrap";
type SpaRootProps = {
  /** Pathname χωρίς query (π.χ. `/movies/foo`). */
  ssrPath: string;
  /** Αρχική: main επικαλύπτει το #home-hero-slot (ίδιο ύψος, χωρίς CLS). */
  homeMainOverlap?: boolean;
  suppressHydrationWarning?: boolean;
};

/** Client boundary — bootstrap μόνο από `#__RQ_STATE__` (ένα JSON ανά σελίδα, όχι διπλό prop). */
export default function SpaRoot({ ssrPath, homeMainOverlap, suppressHydrationWarning }: SpaRootProps) {
  const dehydratedState = useMemo(() => readRqBootstrapState(), []);

  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      <SpaProviders dehydratedState={dehydratedState}>
        <App ssrPath={ssrPath} homeMainOverlap={homeMainOverlap} />
      </SpaProviders>
    </div>
  );
}
