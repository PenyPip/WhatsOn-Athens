"use client";

import dynamic from "next/dynamic";
import type { DehydratedState } from "@tanstack/react-query";

const SpaRoot = dynamic(() => import("@/components/SpaRoot"), {
  ssr: false,
  loading: () => null,
});

type ClientOnlySpaRootProps = {
  ssrPath: string;
  dehydratedState?: DehydratedState;
};

/** Αρχική με static LCP: χωρίς SSR του SPA — λιγότερο render delay πριν το paint. */
export default function ClientOnlySpaRoot({ ssrPath, dehydratedState }: ClientOnlySpaRootProps) {
  return <SpaRoot ssrPath={ssrPath} dehydratedState={dehydratedState} />;
}
