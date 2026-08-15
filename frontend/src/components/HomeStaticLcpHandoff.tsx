import { useEffect } from "react";
import { useHomeLcpOverlayDone } from "@/hooks/useHomeLcpDone";

/**
 * Mobile: κρύβει το static LCP overlay ώστε να ξεκλειδώσουν τα below-fold queries.
 * Χωρίς αυτό → deadlock / αιώνια skeletons («Ταινίες σήμερα»).
 * Desktop: το handoff γίνεται στο MostTalkedAboutHero όταν έτοιμο το poster.
 */
export default function HomeStaticLcpHandoff() {
  const markOverlayDone = useHomeLcpOverlayDone();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const staticEl = document.getElementById("home-static-lcp");
    if (!staticEl) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (document.documentElement.classList.contains("spa-lcp-done")) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const finish = () => {
      if (cancelled) return;
      if (document.documentElement.classList.contains("spa-lcp-done")) return;
      /** Μόνο overlay — το slot μένει μέχρι live hero + poster. */
      markOverlayDone();
    };

    /**
     * Περίμενε το static LCP img (ή σύντομο idle) πριν unlock —
     * άμεσο rAF έκλεβε bandwidth/CPU από το LCP element.
     */
    const scheduleUnlock = () => {
      if (cancelled) return;
      const img = staticEl.querySelector("img");
      if (img instanceof HTMLImageElement && !img.complete) {
        const onReady = () => {
          img.removeEventListener("load", onReady);
          img.removeEventListener("error", onReady);
          if (typeof requestIdleCallback !== "undefined") {
            idleId = requestIdleCallback(finish, { timeout: 400 });
          } else {
            finish();
          }
        };
        img.addEventListener("load", onReady, { once: true });
        img.addEventListener("error", onReady, { once: true });
        return;
      }
      if (typeof requestIdleCallback !== "undefined") {
        idleId = requestIdleCallback(finish, { timeout: 400 });
      } else {
        finish();
      }
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(scheduleUnlock);
    });
    timeoutId = window.setTimeout(finish, 1500);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (idleId !== undefined && typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [markOverlayDone]);

  return null;
}
