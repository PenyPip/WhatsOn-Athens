"use client";

import { useEffect, useState } from "react";
import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import { HomeStaticLcpContext } from "@/contexts/HomeStaticLcpContext";
import type { DehydratedState } from "@tanstack/react-query";
import { readRqBootstrapState } from "@/lib/rqBootstrap";

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
 * Client boundary - bootstrap από `/_rq/*.js` → `window.__RQ_BOOTSTRAP__` (ή `#__RQ_STATE__`).
 * Διαβάζουμε στο effect (όχι στο πρώτο render) ώστε SSR/hydrate να ταιριάζουν.
 */
export default function SpaRoot({
  ssrPath,
  homeMainOverlap,
  homeStaticLcp = false,
  suppressHydrationWarning,
}: SpaRootProps) {
  const [dehydratedState, setDehydratedState] = useState<DehydratedState | undefined>(undefined);

  useEffect(() => {
    setDehydratedState(readRqBootstrapState());
  }, []);

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
