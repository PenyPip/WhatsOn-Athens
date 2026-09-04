"use client";

import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lazyWithChunkReload } from "@/lib/lazyWithChunkReload";

const CookieConsentBanner = lazyWithChunkReload(() => import("@/components/CookieConsentBanner"));

/**
 * Μετά το πρώτο paint - δεν μπαίνει στο critical path (κινητό PSI).
 * Portal στο `document.body` (όχι μέσα στο `<main>`) ώστε το late mount να μην
 * μετράει ως layout shift του main (CLS ~1 στα Lighthouse audits).
 */
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

  if (!ready || typeof document === "undefined") return null;

  return createPortal(
    <Suspense fallback={null}>
      <CookieConsentBanner />
    </Suspense>,
    document.body,
  );
}
