import { useCallback } from "react";

function hideHomeStaticLcpDom() {
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
  const spacer = document.getElementById("home-hero-ssr-spacer");
  if (spacer) {
    spacer.style.setProperty("display", "none", "important");
    spacer.style.setProperty("height", "0", "important");
    spacer.style.setProperty("min-height", "0", "important");
    spacer.style.setProperty("max-height", "0", "important");
    spacer.style.setProperty("overflow", "hidden", "important");
  }
}

/** Κρύβει μόνο το static overlay — χωρίς layout shift (margin / slot). */
export function useHomeLcpOverlayDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-done");
  }, []);
}

/** Ολοκληρώνει handoff: κρύβει slot + spacer (CSS + DOM fallback για διπλό hero). */
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
