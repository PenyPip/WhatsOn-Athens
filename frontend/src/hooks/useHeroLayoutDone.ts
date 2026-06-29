import { useEffect, useState } from "react";

/** True όταν ολοκληρωθεί το hero layout handoff (`spa-lcp-layout-done`). */
export function useHeroLayoutDone(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (!document.getElementById("home-static-lcp")) {
        setReady(true);
        return;
      }
      if (document.documentElement.classList.contains("spa-lcp-layout-done")) {
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
