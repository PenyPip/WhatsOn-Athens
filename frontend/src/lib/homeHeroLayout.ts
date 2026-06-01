/** Κοινές διαστάσεις hero (server critical CSS + React) — αποφυγή CLS. */
export const HOME_HERO_MIN_HEIGHT_PX = 500;
export const HOME_HERO_COMPACT_MIN_HEIGHT_PX = 400;
export const HOME_HERO_COMPACT_MIN_HEIGHT_MD_PX = 440;

/** Κρίσιμο CSS για `/` — in-flow slot + overlap του main (χωρίς fixed overlay). */
export function homeHeroCriticalCss(): string {
  const min = HOME_HERO_COMPACT_MIN_HEIGHT_PX;
  const minMd = HOME_HERO_COMPACT_MIN_HEIGHT_MD_PX;
  return (
    `#home-hero-slot{position:relative;width:100%;min-height:${min}px;background:#13143e;overflow:hidden;contain:layout style paint}` +
    `@media(min-width:768px){#home-hero-slot{min-height:${minMd}px}}` +
    `#home-static-lcp{position:absolute;inset:0;z-index:1;width:100%;height:100%;overflow:hidden;pointer-events:none;background:linear-gradient(135deg,#1c1a52,#13143e 50%,#0d0c24)}` +
    `#home-static-lcp .home-static-lcp__inner{position:relative;display:flex;align-items:center;justify-content:center;max-width:80rem;height:100%;margin:0 auto;padding:2rem 3rem;box-sizing:border-box}` +
    `@media(min-width:768px){#home-static-lcp .home-static-lcp__inner{padding:2.5rem 4rem;justify-content:space-between;gap:2.5rem}}` +
    `#home-static-lcp .home-static-lcp__copy{flex:1;min-width:0;max-width:36rem;align-self:center}` +
    `#home-static-lcp .home-static-lcp__badge{display:inline-block;margin:0 0 1rem;padding:.5rem 1rem;border:1px solid rgba(252,211,77,.55);border-radius:9999px;background:linear-gradient(90deg,rgba(251,191,36,.3),rgba(217,119,6,.1));font:700 11px/1.2 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#fffbeb}` +
    `#home-static-lcp .home-static-lcp__title{margin:0;font-family:Georgia,serif;font-size:1.5rem;font-weight:700;line-height:1.15;color:#fff}` +
    `@media(min-width:768px){#home-static-lcp .home-static-lcp__title{font-size:2rem}}` +
    `#home-static-lcp .home-static-lcp__poster-wrap{flex-shrink:0;width:10.5rem;aspect-ratio:2/3}` +
    `@media(min-width:768px){#home-static-lcp .home-static-lcp__poster-wrap{width:13rem}}` +
    `#home-static-lcp img.home-static-lcp__poster{display:block;width:100%;height:100%;object-fit:contain;object-position:center;border-radius:.75rem}` +
    `html.spa-lcp-done #home-static-lcp{opacity:0;visibility:hidden}` +
    `.home-main-overlap{margin-top:-${min}px;padding-top:3.5rem}` +
    `@media(min-width:768px){.home-main-overlap{margin-top:-${minMd}px;padding-top:4rem}}`
  );
}

/** Compact hero — πιο πολυσυζητημένες (χωράει ολόκληρη αφίσα 2:3). */
export const HOME_HERO_COMPACT_SECTION_CLASS =
  "relative min-h-[400px] overflow-hidden bg-[#13143E] max-md:-mt-16 max-md:pt-16 md:-mt-28 md:pt-28 md:min-h-[440px]";

/** @deprecated Χρησιμοποίησε HOME_HERO_COMPACT_SECTION_CLASS */
export const HOME_HERO_SECTION_CLASS = HOME_HERO_COMPACT_SECTION_CLASS;
