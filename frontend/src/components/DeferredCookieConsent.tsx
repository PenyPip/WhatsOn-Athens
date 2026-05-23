"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const CookieConsentBanner = lazy(() => import("@/components/CookieConsentBanner"));

/** Μετά το πρώτο paint — δεν μπαίνει στο critical path (κινητό PSI). */
export default function DeferredCookieConsent() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = () => setReady(true);
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(enable, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(enable, 1200);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <CookieConsentBanner />
    </Suspense>
  );
}
