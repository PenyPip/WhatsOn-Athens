import { Literata } from "next/font/google";

/** Serif μόνο για άρθρα — όχι στο critical path αρχικής / λιστών. */
export const literata = Literata({
  subsets: ["greek", "latin"],
  display: "swap",
  adjustFontFallback: true,
  variable: "--font-article",
  weight: ["400", "600", "700"],
});
