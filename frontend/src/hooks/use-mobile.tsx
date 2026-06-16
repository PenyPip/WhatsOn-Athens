import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MQL = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/** Mobile viewport — SSR/hydration snapshot false, sync μετά mount (χωρίς window στο prerender). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MQL);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
