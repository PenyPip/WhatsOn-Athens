import { useCallback } from "react";

export { HOME_HERO_SPACER_LOCK_SCRIPT } from "@/lib/homeHeroLayout";

/** Ύψος in-flow spacer = absolute hero − main overlap padding (3.5rem / 7rem). */
export function homeHeroSpacerCssHeight(isDesktop: boolean): string {
  return isDesktop ? "calc(580px - 7rem)" : "calc(380px - 3.5rem)";
}

/**
 * Κλειδώνει το `#home-hero-ssr-spacer` ανοιχτό με σωστό ύψος.
 * Χρειάζεται γιατί παλιό critical CSS (cache) μηδένιζε το spacer στο `spa-lcp-layout-done`
 * ενώ το live hero μένει absolute → οι κάρτες μπαίνουν κάτω από το navy.
 */
export function lockHomeHeroSpacerDom() {
  if (typeof document === "undefined") return;
  const spacer = document.getElementById("home-hero-ssr-spacer");
  if (!spacer) return;
  const desktop = window.matchMedia("(min-width: 768px)").matches;
  const h = homeHeroSpacerCssHeight(desktop);
  spacer.style.setProperty("display", "block", "important");
  spacer.style.setProperty("height", h, "important");
  spacer.style.setProperty("min-height", h, "important");
  spacer.style.setProperty("max-height", h, "important");
  spacer.style.setProperty("overflow", "hidden", "important");
  spacer.style.setProperty("flex-shrink", "0", "important");
}

/** Κρύβει μόνο το static overlay/slot - ΟΧΙ το spacer (κρατάει ύψος → χωρίς CLS). */
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

function clearHomeHeroSpacerLock() {
  if (typeof document === "undefined") return;
  const spacer = document.getElementById("home-hero-ssr-spacer");
  if (!spacer) return;
  spacer.style.removeProperty("display");
  spacer.style.removeProperty("height");
  spacer.style.removeProperty("min-height");
  spacer.style.removeProperty("max-height");
  spacer.style.removeProperty("overflow");
  spacer.style.removeProperty("flex-shrink");
}

/** Το server `#home-hero-slot` είναι έξω από το Router - κρύψ’ το όταν φεύγεις από την αρχική. */
export function syncHomeHeroSlotForPath(pathname: string) {
  if (typeof document === "undefined") return;
  const onHome = pathname === "/";
  document.documentElement.classList.toggle("spa-not-home", !onHome);
  if (!onHome) {
    hideHomeStaticLcpDom();
    clearHomeHeroSpacerLock();
  } else {
    lockHomeHeroSpacerDom();
  }
}

/** Κρύβει μόνο το static overlay - χωρίς layout shift (margin / slot). */
export function useHomeLcpOverlayDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-done");
  }, []);
}

/** Ολοκληρώνει handoff: κρύβει static slot - το spacer μένει για σταθερό ύψος. */
export function useHomeLcpLayoutDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-layout-done");
    hideHomeStaticLcpDom();
    lockHomeHeroSpacerDom();
  }, []);
}

/** Desktop: overlay + layout μαζί - ποτέ static και live ταυτόχρονα. */
export function useHomeLcpFullyDone(): () => void {
  return useCallback(() => {
    document.documentElement.classList.add("spa-lcp-done", "spa-lcp-layout-done");
    hideHomeStaticLcpDom();
    lockHomeHeroSpacerDom();
  }, []);
}
