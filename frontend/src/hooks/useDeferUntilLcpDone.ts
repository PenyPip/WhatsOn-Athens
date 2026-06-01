import { useEffect, useState } from "react";

/** Αναβάλλει δευτερεύοντα queries μέχρι να κρυφτεί το static LCP overlay. */
export function useDeferUntilLcpDone(): boolean {
  const [ready, setReady] = useState(() => {
    if (typeof document === "undefined") return false;
    if (!document.getElementById("home-static-lcp")) return true;
    return document.documentElement.classList.contains("spa-lcp-done");
  });

  useEffect(() => {
    if (ready) return;
    const sync = () => {
      if (document.documentElement.classList.contains("spa-lcp-done")) setReady(true);
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [ready]);

  return ready;
}
