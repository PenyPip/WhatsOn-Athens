"use client";

import { useEffect } from "react";

/** Κρύβει το fixed LCP overlay χωρίς CLS (opacity/visibility μόνο). */
export default function MarkLcpDone() {
  useEffect(() => {
    document.documentElement.classList.add("spa-lcp-done", "spa-lcp-layout-done");
  }, []);
  return null;
}
