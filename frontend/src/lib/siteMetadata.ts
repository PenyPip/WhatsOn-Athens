/** Κοινά SEO / Open Graph — χρησιμοποιούνται στο root layout και (αργότερα) ανά σελίδα. */

export const siteSeo = {
  siteName: "37Ν",
  titleDefault: "37Ν — Ταινίες & θέατρο στην Αθήνα και τη Θεσσαλονίκη",
  description:
    "Πού παίζεται κάθε ταινία και παράσταση: ώρες προβολών, σινεμά, θέατρο, ειδώλια και αναζήτηση σε όλη την Ελλάδα.",
  keywords: [
    "ταινίες",
    "σινεμά",
    "προβολές",
    "θέατρο",
    "Αθήνα",
    "Θεσσαλονίκη",
    "ωράριο σινεμά",
    "εισιτήρια",
  ],
  /** Από το `public/` · αντικατάσταση με `og.png` (1200×630) αν προτιμάς PNG. */
  ogImagePath: "/og.svg",
  ogImageAlt: "37Ν — Οδηγός ταινιών και θεάτρου",
} as const;

const DEFAULT_PRODUCTION_ORIGIN = "https://the37n.gr";

/** Βάση για canonical / og:url / απόλυτα paths εικόνων. */
export function getMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.endsWith("/") ? raw : `${raw}/`);
    } catch {
      /* πέφτουμε στο default */
    }
  }
  if (process.env.NODE_ENV === "development") {
    return new URL("http://localhost:3000/");
  }
  return new URL(`${DEFAULT_PRODUCTION_ORIGIN}/`);
}
