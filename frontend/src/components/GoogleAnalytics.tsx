"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useLocation } from "react-router-dom";
import { analyticsCookiesAllowed } from "@/lib/cookieConsent";
import { GA_MEASUREMENT_ID } from "@/lib/siteMetadata";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** SPA page views μετά τη φόρτωση του gtag. */
function sendPageView(pagePath: string) {
  if (typeof window.gtag !== "function") return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: pagePath });
}

/**
 * Google Analytics 4 — μόνο όταν ο χρήστης έχει επιλέξει «Αποδοχή όλων».
 */
export default function GoogleAnalytics() {
  const { pathname, search } = useLocation();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(analyticsCookiesAllowed());
    const onConsent = () => setAllowed(analyticsCookiesAllowed());
    window.addEventListener("whatson:cookie-consent", onConsent);
    return () => window.removeEventListener("whatson:cookie-consent", onConsent);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    sendPageView(pathname + search);
  }, [allowed, pathname, search]);

  if (!allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
