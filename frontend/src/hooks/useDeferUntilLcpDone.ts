import { useSyncExternalStore } from "react";

function readDeferReady(): boolean {
  if (!document.getElementById("home-static-lcp")) return true;
  return document.documentElement.classList.contains("spa-lcp-done");
}

function subscribeDeferReady(onStoreChange: () => void) {
  const sync = () => onStoreChange();
  sync();
  const obs = new MutationObserver(sync);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

/** Αναβάλλει δευτερεύοντα queries μέχρι να κρυφτεί το static LCP overlay. */
export function useDeferUntilLcpDone(): boolean {
  return useSyncExternalStore(subscribeDeferReady, () => false, readDeferReady);
}
