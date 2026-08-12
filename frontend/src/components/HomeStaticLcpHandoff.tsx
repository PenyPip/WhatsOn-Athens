import { useEffect } from "react";
import { useHomeLcpOverlayDone } from "@/hooks/useHomeLcpDone";

/**
 * Mobile: κρύβει το static LCP overlay πριν το live hero ξεκλειδώσει queries.
 * Χωρίς αυτό → deadlock: hero loading περιμένει spa-lcp-done, και spa-lcp-done
 * περίμενε loading=false (HomeBody: isMobile && !deferSecondary).
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
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const finish = () => {
          if (!cancelled) {
            /** Μόνο overlay — το slot (#home-hero-slot) μένει μέχρι live hero + poster. */
            markOverlayDone();
          }
        };
        if (typeof requestIdleCallback !== "undefined") {
          idleId = requestIdleCallback(finish, { timeout: 1200 });
        } else {
          finish();
        }
        /** Failsafe αν idle δεν τρέξει (busy main thread). */
        timeoutId = window.setTimeout(finish, 2000);
      });
    });
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
