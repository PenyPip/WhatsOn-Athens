/** Κοινές διαστάσεις hero (server critical CSS + React) — αποφυγή CLS. */
export const HOME_HERO_MIN_HEIGHT_PX = 500;
/** Mobile: χαμηλότερο slot — αφίσα + τίτλος χωρίς υπερβολικό scroll. */
export const HOME_HERO_COMPACT_MIN_HEIGHT_PX = 380;
export const HOME_HERO_COMPACT_MIN_HEIGHT_MD_PX = 580;

/**
 * Κρίσιμο CSS για `/` — στατικό string (χωρίς interpolation/concatenation).
 * Το SWC minify στο next build χαλάει αλυσίδες template literals → σπασμένο hero στο hard refresh.
 */
export const HOME_HERO_CRITICAL_CSS =
  "body{position:relative}" +
  "#home-hero-slot{position:absolute;top:0;left:0;right:0;z-index:1;width:100%;min-height:380px;background:#13143e;overflow:hidden;contain:layout style paint}" +
  "@media(min-width:768px){#home-hero-slot{min-height:580px}}" +
  "#home-static-lcp{position:absolute;inset:0;z-index:1;width:100%;height:100%;overflow:hidden;pointer-events:none;background:linear-gradient(135deg,#1c1a52,#13143e 50%,#0d0c24)}" +
  "#home-static-lcp .home-static-lcp__inner{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;max-width:80rem;height:100%;margin:0 auto;padding:1.25rem 1rem 1.5rem;box-sizing:border-box;gap:1rem}" +
  "@media(min-width:768px){#home-static-lcp .home-static-lcp__inner{flex-direction:row;padding:2.5rem 4rem;justify-content:space-between;align-items:center;gap:2.5rem}}" +
  "#home-static-lcp .home-static-lcp__poster-wrap{order:-1;width:9.5rem}" +
  "@media(min-width:768px){#home-static-lcp .home-static-lcp__poster-wrap{order:0;width:15.5rem}}" +
  "#home-static-lcp .home-static-lcp__copy{flex:1;min-width:0;max-width:36rem;width:100%;align-self:center;text-align:center}" +
  "@media(min-width:768px){#home-static-lcp .home-static-lcp__copy{text-align:left}}" +
  "#home-static-lcp .home-static-lcp__badge{display:inline-block;margin:0 0 1rem;padding:.5rem 1rem;border:1px solid rgba(252,211,77,.55);border-radius:9999px;background:linear-gradient(90deg,rgba(251,191,36,.3),rgba(217,119,6,.1));font:700 11px/1.2 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#fffbeb}" +
  "#home-static-lcp .home-static-lcp__title{margin:0 0 .75rem;font-family:Georgia,serif;font-size:1.75rem;font-weight:700;line-height:1.12;color:#fff}" +
  "@media(min-width:768px){#home-static-lcp .home-static-lcp__title{font-size:2.5rem;margin-bottom:1rem}}" +
  "#home-static-lcp .home-static-lcp__synopsis{margin:0;font:400 .875rem/1.6 system-ui,sans-serif;color:#fff;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:38rem}" +
  "@media(min-width:768px){#home-static-lcp .home-static-lcp__synopsis{font-size:1rem;line-height:1.7;-webkit-line-clamp:6}}" +
  "#home-static-lcp .home-static-lcp__poster-wrap{flex-shrink:0;aspect-ratio:2/3}" +
  "@media(min-width:1024px){#home-static-lcp .home-static-lcp__poster-wrap{width:17rem}}" +
  "#home-static-lcp img.home-static-lcp__poster{display:block;width:100%;height:100%;object-fit:contain;object-position:center;border-radius:.75rem}" +
  "html.spa-lcp-done #home-static-lcp{opacity:0;visibility:hidden}" +
  "html.spa-lcp-layout-done #home-hero-slot{display:none}" +
  "html:not(.spa-lcp-done) [data-home-hero-live]{opacity:0;pointer-events:none}" +
  "html.spa-lcp-done [data-home-hero-live]{opacity:1;pointer-events:auto}" +
  ".home-main-overlap{padding-top:3.5rem}" +
  "@media(min-width:768px){.home-main-overlap{padding-top:4rem}}";

/** @deprecated Χρησιμοποίησε HOME_HERO_CRITICAL_CSS */
export function homeHeroCriticalCss(): string {
  return HOME_HERO_CRITICAL_CSS;
}

/** Compact hero — ίδιο ύψος με #home-hero-slot στο mobile (χωρίς CLS στο handoff). */
export const HOME_HERO_COMPACT_SECTION_CLASS =
  "relative overflow-hidden bg-[#13143E] max-md:h-[380px] max-md:min-h-[380px] max-md:max-h-[380px] md:-mt-28 md:pt-28 md:min-h-[580px]";

/** @deprecated Χρησιμοποίησε HOME_HERO_COMPACT_SECTION_CLASS */
export const HOME_HERO_SECTION_CLASS = HOME_HERO_COMPACT_SECTION_CLASS;
