import { useEffect, useState } from "react";

/**
 * Αναβάλλει below-fold / δευτερεύοντα work μέχρι idle μετά LCP — μικρότερο TBT.
 * Mobile: μικρότερο idle timeout (λιγότερο storm αμέσως στο spa-lcp-done).
 * Δεν αγγίζει deferProgramData / movies / showtimes.
 */
export function useDeferUntilIdleAfterLcp(lcpDone: boolean, timeoutMs = 2200): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!lcpDone) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setReady(true);
    };
    const mobile =
      typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    const idleTimeout = mobile ? Math.min(timeoutMs, 900) : timeoutMs;
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(finish, { timeout: idleTimeout });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(finish, mobile ? 120 : 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [lcpDone, timeoutMs]);

  return ready;
}
