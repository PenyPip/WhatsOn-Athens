"use client";

import { useEffect } from "react";

/** Αφαιρεί το server LCP shell μετά το mount — αποφεύγει διπλή αφίσα όταν φορτώσει το SPA. */
export default function HideHomeStaticLcp() {
  useEffect(() => {
    document.getElementById("home-static-lcp")?.remove();
  }, []);
  return null;
}
