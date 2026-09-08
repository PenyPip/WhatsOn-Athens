"use client";

import { useMemo } from "react";
import SpaProviders from "@/components/SpaProviders";
import App from "@/App";
import { HomeStaticLcpContext } from "@/contexts/HomeStaticLcpContext";
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
 * Client boundary - bootstrap ΜΟΝΟ από `#__RQ_STATE__`.
 * Μην περνάς DehydratedState ως prop: το Next το ξαναγράφει στο RSC flight (~2× HTML).
 */
export default function SpaRoot({
  ssrPath,
  homeMainOverlap,
  homeStaticLcp = false,
  suppressHydrationWarning,
}: SpaRootProps) {
  const dehydratedState = useMemo(() => readRqBootstrapState(), []);

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
