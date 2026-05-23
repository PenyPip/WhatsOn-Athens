import { DM_Sans } from "next/font/google";

/** Μόνο 400 + preload — σταθερό σώμα κειμένου, λιγότερο CLS (κινητό). */
export const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  variable: "--font-dm-sans",
  weight: ["400"],
});
