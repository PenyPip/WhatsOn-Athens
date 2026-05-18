"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  hasCookieConsentAnswer,
  saveCookieConsent,
  COOKIE_BANNER_OPEN_EVENT,
  type CookieConsentValue,
} from "@/lib/cookieConsent";

/**
 * Banner συναίνεσης cookies — δωρεάν, χωρίς τρίτο CMP.
 * Σταθερό κάτω· δεν εμφανίζεται αν υπάρχει ήδη αποθηκευμένη επιλογή.
 */
export default function CookieConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasCookieConsentAnswer()) setOpen(true);
  }, []);

  useEffect(() => {
    const onReopen = () => setOpen(true);
    window.addEventListener(COOKIE_BANNER_OPEN_EVENT, onReopen);
    return () => window.removeEventListener(COOKIE_BANNER_OPEN_EVENT, onReopen);
  }, []);

  const choose = (value: CookieConsentValue) => {
    saveCookieConsent(value);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-black/90 px-4 py-4 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md md:px-6 md:py-5"
    >
      <div className="container mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-white/85 font-body">
          <p id="cookie-consent-title" className="font-display text-base font-semibold tracking-tight text-white md:text-lg">
            Cookies & απόρρητο
          </p>
          <p id="cookie-consent-desc" className="mt-2 text-white/70">
            Χρησιμοποιούμε απαραίτητα cookies για λειτουργία του site. Με την «Αποδοχή όλων» συμφωνείς και σε
            προαιρετικά (π.χ. στατιστικά) όταν τα ενεργοποιήσουμε. Μπορείς να επιλέξεις μόνο τα απαραίτητα.{" "}
            <Link to="/privacy" className="text-amber-200/95 underline underline-offset-2 hover:text-amber-100">
              Απόρρητο & cookies
            </Link>
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => choose("essential")}
          >
            Μόνο απαραίτητα
          </Button>
          <Button
            type="button"
            className="bg-amber-500 text-black hover:bg-amber-400"
            onClick={() => choose("all")}
          >
            Αποδοχή όλων
          </Button>
        </div>
      </div>
    </div>
  );
}
