import { useEffect, useState } from "react";

/**
 * Desktop: αναβάλλει below-fold / δευτερεύοντα work μέχρι idle μετά LCP — μικρότερο TBT.
 * Mobile: επιστρέφει true μόλις `lcpDone` (ίδια συμπεριφορά με πριν).
 */
export function useDeferUntilIdleAfterLcp(lcpDone: boolean, timeoutMs = 2200): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!lcpDone) {
      setReady(false);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setReady(true);
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(finish, { timeout: timeoutMs });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(finish, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [lcpDone, timeoutMs]);

  return ready;
}
