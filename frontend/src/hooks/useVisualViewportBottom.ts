import { useSyncExternalStore } from "react";

function getBottomInset(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

function subscribe(onStoreChange: () => void): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => undefined;
  const handler = () => onStoreChange();
  vv.addEventListener("resize", handler);
  vv.addEventListener("scroll", handler);
  window.addEventListener("resize", handler);
  return () => {
    vv.removeEventListener("resize", handler);
    vv.removeEventListener("scroll", handler);
    window.removeEventListener("resize", handler);
  };
}

/** Κρατά το fixed bottom bar κολλημένο στο ορατό κάτω μέρος (iOS Safari toolbar). */
export function useVisualViewportBottom(): number {
  return useSyncExternalStore(subscribe, getBottomInset, () => 0);
}
