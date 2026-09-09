"use client";

import { useEffect, useState } from "react";
import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import { HomeStaticLcpContext } from "@/contexts/HomeStaticLcpContext";
import type { DehydratedState } from "@tanstack/react-query";
import { loadRqBootstrapState, runAfterHomeLcp } from "@/lib/rqBootstrap";

type SpaRootProps = {
  /** Pathname χωρίς query (π.χ. `/movies/foo`). */
  ssrPath: string;
  /** Αρχική: main επικαλύπτει το #home-hero-slot (ίδιο ύψος, χωρίς CLS). */
  homeMainOverlap?: boolean;
  /** Server HTML έχει HomeStaticLcp - το live hero δεν σχεδιάζει loading shell στο SSR. */
  homeStaticLcp?: boolean;
  suppressHydrationWarning?: boolean;
};

/**
 * Client boundary - RQ από `/_rq/*.json` (fetch), όχι blocking script.
 * Στην αρχική με static LCP: φόρτωση μετά `spa-lcp-done` (χαμηλότερο TBT).
 */
export default function SpaRoot({
  ssrPath,
  homeMainOverlap,
  homeStaticLcp = false,
  suppressHydrationWarning,
}: SpaRootProps) {
  const [dehydratedState, setDehydratedState] = useState<DehydratedState | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const apply = () => {
      void loadRqBootstrapState().then((state) => {
        if (!cancelled && state) setDehydratedState(state);
      });
    };

    if (homeStaticLcp) {
      const stop = runAfterHomeLcp(apply);
      return () => {
        cancelled = true;
        stop();
      };
    }

    apply();
    return () => {
      cancelled = true;
    };
  }, [homeStaticLcp]);

  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      <HomeStaticLcpContext.Provider value={homeStaticLcp}>
        <SpaProviders dehydratedState={dehydratedState}>
          <App ssrPath={ssrPath} homeMainOverlap={homeMainOverlap} homeStaticLcp={homeStaticLcp} />
        </SpaProviders>
      </HomeStaticLcpContext.Provider>
    </div>
  );
}
