const PRODUCTION_ORIGIN = "https://the37n.gr";

/** Same-origin path για γρηγορότερο preload/LCP (χωρίς επιπλέο origin hop). */
export function lcpImageSrc(href: string): string {
  if (href.startsWith(PRODUCTION_ORIGIN)) {
    return href.slice(PRODUCTION_ORIGIN.length) || "/";
  }
  return href;
}
