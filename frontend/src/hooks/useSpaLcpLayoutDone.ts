import { useEffect, useState } from "react";

/**
 * true όταν το static→live hero handoff ολοκληρώθηκε (`spa-lcp-layout-done`).
 * Failsafe ώστε να μην μείνουν κενές αφίσες αν το handoff αργήσει.
 */
export function useSpaLcpLayoutDone(failsafeMs = 2500): boolean {
  const [done, setDone] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("spa-lcp-layout-done")
      : false,
  );

  useEffect(() => {
    if (done) return;
    if (typeof document === "undefined") return;

    const sync = () => {
      if (document.documentElement.classList.contains("spa-lcp-layout-done")) {
        setDone(true);
      }
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const timeoutId = window.setTimeout(() => setDone(true), failsafeMs);
    return () => {
      obs.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [done, failsafeMs]);

  return done;
}
