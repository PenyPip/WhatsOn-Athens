import { useCallback } from "react";

/** Κρύβει το mobile static LCP overlay (χωρίς layout shift). */
export function useHomeLcpDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-done");
  }, []);
}
