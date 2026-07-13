import { useLayoutEffect } from "react";

const CSS_VAR = "--mobile-safe-bottom-fixed";

/** Κλειδώνει το safe-area inset κάτω στην πρώτη μέτρηση — αποφεύγει resize της tab bar στο scroll (iOS Safari). */
export function useStableMobileSafeArea() {
  useLayoutEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches) return;

    const existing = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(CSS_VAR),
    );
    if (Number.isFinite(existing) && existing > 0) return;

    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;left:-9999px;bottom:0;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px);";
    document.body.appendChild(probe);
    const measured = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);

    document.documentElement.style.setProperty(CSS_VAR, `${measured}px`);
  }, []);
}
