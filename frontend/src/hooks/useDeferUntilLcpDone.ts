import { useEffect, useState } from "react";

/** Αναβάλλει δευτερεύοντα queries μέχρι να κρυφτεί το static LCP overlay. */
export function useDeferUntilLcpDone(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (!document.getElementById("home-static-lcp")) {
        setReady(true);
        return;
      }
      if (document.documentElement.classList.contains("spa-lcp-done")) {
        setReady(true);
      }
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return ready;
}
