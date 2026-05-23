import { DM_Sans, Literata, Unbounded } from "next/font/google";

export const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-dm-sans",
  weight: ["400", "700"],
});

/** Headings — χωρίς preload (λιγότερα render-blocking). */
export const literata = Literata({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-literata",
  weight: ["400", "700"],
});

/** Logo/nav — χωρίς preload (λιγότερο render-blocking στο κινητό). */
export const unbounded = Unbounded({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-unbounded",
  weight: ["300", "700"],
});
