import { useCallback, useEffect } from "react";

/** Κινητό: μετά τη φόρτωση αφίσας Hero. Desktop: αμέσως (χωρίς static overlay). */
export function useHomeLcpDone(): () => void {
  const markDone = useCallback(() => {
    document.documentElement.classList.add("spa-lcp-done");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      markDone();
    }
  }, [markDone]);

  return markDone;
}
