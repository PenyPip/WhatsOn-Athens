"use client";

import { useMemo } from "react";
import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import type { DehydratedState } from "@tanstack/react-query";
import { readRqBootstrapState } from "@/lib/rqBootstrap";
type SpaRootProps = {
  /** Pathname χωρίς query (π.χ. `/movies/foo`). */
  ssrPath: string;
  /** React Query bootstrap από build-time prefetch (όταν υπάρχει στο flight· αλλιώς `#__RQ_STATE__`). */
  bootstrapState?: DehydratedState;
  /** Αρχική: main επικαλύπτει το #home-hero-slot (ίδιο ύψος, χωρίς CLS). */
  homeMainOverlap?: boolean;
  suppressHydrationWarning?: boolean;
};

/** Client boundary — bootstrap μόνο από `#__RQ_STATE__` (αποφυγή διπλού JSON στο HTML). */
export default function SpaRoot({ ssrPath, bootstrapState, homeMainOverlap, suppressHydrationWarning }: SpaRootProps) {
  const dehydratedState = useMemo(
    () => readRqBootstrapState() ?? bootstrapState,
    [bootstrapState],
  );

  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      <SpaProviders dehydratedState={dehydratedState}>
        <App ssrPath={ssrPath} homeMainOverlap={homeMainOverlap} />
      </SpaProviders>
    </div>
  );
}
