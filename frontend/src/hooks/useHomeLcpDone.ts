import { useCallback } from "react";

/** Κρύβει μόνο το static overlay/slot — ΟΧΙ το spacer (κρατάει ύψος → χωρίς CLS). */
export function hideHomeStaticLcpDom() {
  if (typeof document === "undefined") return;
  const slot = document.getElementById("home-hero-slot");
  if (slot) {
    slot.style.setProperty("display", "none", "important");
    slot.setAttribute("aria-hidden", "true");
  }
  const staticLcp = document.getElementById("home-static-lcp");
  if (staticLcp) {
    staticLcp.style.setProperty("opacity", "0", "important");
    staticLcp.style.setProperty("visibility", "hidden", "important");
  }
}

/** Το server `#home-hero-slot` είναι έξω από το Router — κρύψ’ το όταν φεύγεις από την αρχική. */
export function syncHomeHeroSlotForPath(pathname: string) {
  if (typeof document === "undefined") return;
  const onHome = pathname === "/";
  document.documentElement.classList.toggle("spa-not-home", !onHome);
  if (!onHome) hideHomeStaticLcpDom();
}

/** Κρύβει μόνο το static overlay — χωρίς layout shift (margin / slot). */
export function useHomeLcpOverlayDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-done");
  }, []);
}

/** Ολοκληρώνει handoff: κρύβει static slot — το spacer μένει για σταθερό ύψος. */
export function useHomeLcpLayoutDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-layout-done");
    hideHomeStaticLcpDom();
  }, []);
}

/** Desktop: overlay + layout μαζί — ποτέ static και live ταυτόχρονα. */
export function useHomeLcpFullyDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-done", "spa-lcp-layout-done");
    hideHomeStaticLcpDom();
  }, []);
}
