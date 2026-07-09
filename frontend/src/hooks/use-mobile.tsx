import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MQL = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/** Mobile viewport — mobile-first default (ασφαλές defer στο LCP) μέχρι measure. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MQL);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
