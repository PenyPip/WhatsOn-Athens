import { useEffect, useState } from "react";

/** Client-only mount μετά idle — μικρότερο SSR HTML και λιγότερο TBT στο πρώτο paint. */
export function useIdleMount(timeoutMs = 2000): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = () => setReady(true);
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(enable, { timeout: timeoutMs });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(enable, 1);
    return () => window.clearTimeout(t);
  }, [timeoutMs]);

  return ready;
}
