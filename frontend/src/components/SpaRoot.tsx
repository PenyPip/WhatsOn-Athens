"use client";

import { useMemo } from "react";
import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import { HomeStaticLcpContext } from "@/contexts/HomeStaticLcpContext";
import type { DehydratedState } from "@tanstack/react-query";
import { readRqBootstrapState } from "@/lib/rqBootstrap";
type SpaRootProps = {
  /** Pathname χωρίς query (π.χ. `/movies/foo`). */
  ssrPath: string;
  /** React Query bootstrap από build-time prefetch (όταν υπάρχει στο flight· αλλιώς `#__RQ_STATE__`). */
  bootstrapState?: DehydratedState;
  /** Αρχική: main επικαλύπτει το #home-hero-slot (ίδιο ύψος, χωρίς CLS). */
  homeMainOverlap?: boolean;
  /** Server HTML έχει HomeStaticLcp — το live hero δεν σχεδιάζει loading shell στο SSR. */
  homeStaticLcp?: boolean;
  suppressHydrationWarning?: boolean;
};

/** Client boundary — bootstrap από `#__RQ_STATE__` (το flight row συγχρονίζεται στο build). */
export default function SpaRoot({
  ssrPath,
  bootstrapState,
  homeMainOverlap,
  homeStaticLcp = false,
  suppressHydrationWarning,
}: SpaRootProps) {
  const dehydratedState = useMemo(
    () => bootstrapState ?? readRqBootstrapState(),
    [bootstrapState],
  );

  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      <HomeStaticLcpContext.Provider value={homeStaticLcp}>
        <SpaProviders dehydratedState={dehydratedState}>
          <App ssrPath={ssrPath} homeMainOverlap={homeMainOverlap} />
        </SpaProviders>
      </HomeStaticLcpContext.Provider>
    </div>
  );
}
