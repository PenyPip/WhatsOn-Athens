import { useEffect } from "react";
import { useHomeLcpLayoutDone, useHomeLcpOverlayDone } from "@/hooks/useHomeLcpDone";

/**
 * Mobile: κρύβει το static LCP overlay πριν mount το lazy HomeBody.
 * Το Index περιμένει `spa-lcp-done` — χωρίς αυτό το component, deadlock.
 */
export default function HomeStaticLcpHandoff() {
  const markOverlayDone = useHomeLcpOverlayDone();
  const markLayoutDone = useHomeLcpLayoutDone();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const staticEl = document.getElementById("home-static-lcp");
    if (!staticEl) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (document.documentElement.classList.contains("spa-lcp-done")) return;

    let cancelled = false;
    let idleId: number | undefined;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const finish = () => {
          if (!cancelled) {
            markOverlayDone();
            markLayoutDone();
          }
        };
        if (typeof requestIdleCallback !== "undefined") {
          idleId = requestIdleCallback(finish, { timeout: 1200 });
        } else {
          finish();
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (idleId !== undefined && typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(idleId);
      }
    };
  }, [markOverlayDone, markLayoutDone]);

  return null;
}
