/** Κοινά SEO / Open Graph — root layout + hooks ανά σελίδα. */

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

export function getSiteOrigin(): string {
  return getMetadataBase().origin;
}

/** Τίτλος καρτέλας: «Σελίδα · 37Ν». */
export function formatPageTitle(pageTitle: string): string {
  const t = pageTitle.trim();
  if (!t) return siteSeo.titleDefault;
  if (t.includes(siteSeo.siteName)) return t;
  return `${t} · ${siteSeo.siteName}`;
}

/** Meta description ~155–160 χαρακτήρες. */
export function truncateDescription(text: string, maxLen = 158): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Απόλυτο URL για canonical, og:image (paths ή πλήρη Strapi URLs). */
export function resolvePublicAssetUrl(path: string | undefined | null): string | undefined {
  const p = typeof path === "string" ? path.trim() : "";
  if (!p) return undefined;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const base = getMetadataBase();
  return new URL(p.startsWith("/") ? p : `/${p}`, base).toString();
}

export function absolutePageUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, getMetadataBase()).toString();
}

/** Open Graph `og:type` ανά είδος σελίδας. */
export type OgPageType = "website" | "article" | "video.movie";

export function inferOgType(path?: string): OgPageType {
  const p = (path ?? "").trim();
  if (p.startsWith("/movies/") && p.length > "/movies/".length) return "video.movie";
  if (/^\/(theater|dining|reviews)\/[^/]+/.test(p)) return "article";
  return "website";
}

export const defaultOgImageSize = { width: 1200, height: 630 } as const;

/** Τυπικές διαστάσεις αφίσας 2:3 για og:image (όχι ιδανικό 1.91:1 αλλά καλύτερο από κενό). */
export const posterOgImageSize = { width: 800, height: 1200 } as const;
