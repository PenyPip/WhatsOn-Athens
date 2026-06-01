import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * false κατά SSR / πρώτο client pass — true μετά hydrate.
 * Αποφεύγει mismatch όταν το bootstrap (#__RQ_STATE__) δεν υπάρχει στο server render.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
