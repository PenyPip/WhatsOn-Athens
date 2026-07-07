import { useCallback } from "react";

/** Κρύβει μόνο το static overlay — χωρίς layout shift (margin / slot). */
export function useHomeLcpOverlayDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-done");
  }, []);
}

/** Ολοκληρώνει handoff: κρύβει slot + επαναφέρει overlap margin (μόνο όταν live hero έτοιμο). */
export function useHomeLcpLayoutDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-layout-done");
  }, []);
}
