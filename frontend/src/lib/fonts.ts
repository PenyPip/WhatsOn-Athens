import { DM_Sans } from "next/font/google";

/** Μόνο 400 — χωρίς preload (λιγότερο render-blocking· fallback system-ui). */
export const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-dm-sans",
  weight: ["400"],
});
