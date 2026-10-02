import localFont from "next/font/local";

/**
 * Literata self-hosted — όχι next/font/google.
 * Το Docker/BuildKit συχνά σπάει στο fetch από fonts.googleapis.com
 * (`Cannot read properties of null (reading '1')` στο google loader).
 */
export const literata = localFont({
  src: [
    {
      path: "../fonts/literata/literata-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/literata/literata-600.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/literata/literata-700.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
  variable: "--font-article",
  preload: false,
});
