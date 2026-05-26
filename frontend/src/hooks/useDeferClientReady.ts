import { useEffect, useState } from "react";

/** Μετά το πρώτο paint / idle — βαριά client queries & chunks (κινητό PSI). */
export function useDeferClientReady(timeoutMs = 2500): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = () => setReady(true);
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(enable, { timeout: timeoutMs });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(enable, 1200);
    return () => window.clearTimeout(t);
  }, [timeoutMs]);

  return ready;
}
