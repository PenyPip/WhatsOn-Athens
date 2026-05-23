import { DM_Sans, Literata, Unbounded } from "next/font/google";

export const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

export const literata = Literata({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-literata",
  weight: ["400", "500", "600", "700"],
});

export const unbounded = Unbounded({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-unbounded",
  weight: ["300", "700"],
});
