import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MQL = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribeMobile(onStoreChange: () => void) {
  const mql = window.matchMedia(MOBILE_MQL);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getMobileSnapshot(): boolean {
  return window.matchMedia(MOBILE_MQL).matches;
}

/** Mobile viewport — server + hydration snapshot = false (desktop markup), μετά sync. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeMobile, () => false, getMobileSnapshot);
}
