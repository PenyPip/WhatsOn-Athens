import { DM_Sans, Literata } from "next/font/google";

export const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-dm-sans",
  weight: ["400", "700"],
});

/** Headings — χωρίς preload (λιγότερα render-blocking). */
/** Headings — μόνο 400 (μία woff2, λιγότερο blocking· bold via font-synthesis). */
export const literata = Literata({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-literata",
  weight: ["400"],
});
