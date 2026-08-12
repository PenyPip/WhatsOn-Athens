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

    const finish = () => {
      if (cancelled) return;
      if (document.documentElement.classList.contains("spa-lcp-done")) return;
      /** Μόνο overlay — το slot μένει μέχρι live hero + poster. */
      markOverlayDone();
    };

    /** Άμεσο unlock μετά το πρώτο paint — μην περιμένεις idle (κολλάει σε busy main thread). */
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(finish);
    });
    timeoutId = window.setTimeout(finish, 800);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [markOverlayDone]);

  return null;
}
