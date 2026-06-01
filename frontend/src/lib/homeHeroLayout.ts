/** Κοινές διαστάσεις hero (server critical CSS + React) — αποφυγή CLS. */
export const HOME_HERO_MIN_HEIGHT_PX = 500;
export const HOME_HERO_COMPACT_MIN_HEIGHT_PX = 340;

/** Κρίσιμο CSS για `/` — in-flow slot + overlap του main (χωρίς fixed overlay). */
export function homeHeroCriticalCss(): string {
  return (
    `#home-hero-slot{position:relative;width:100%;height:75vh;min-height:${HOME_HERO_MIN_HEIGHT_PX}px;background:#111;overflow:hidden;contain:layout style paint}` +
    `#home-static-lcp{position:absolute;inset:0;z-index:1;width:100%;height:100%;overflow:hidden;pointer-events:none}` +
    `#home-static-lcp img{display:block;width:100%;height:100%;object-fit:cover;opacity:.55}` +
    `#home-static-lcp .home-static-lcp__shade{position:absolute;inset:0;background:linear-gradient(to top,#111 0%,rgba(17,17,17,.45) 45%,rgba(17,17,17,.15) 100%)` +
    `#home-static-lcp .home-static-lcp__copy{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:0 1rem 4rem;max-width:42rem;margin:0 auto}` +
    "@media(min-width:768px){#home-static-lcp .home-static-lcp__copy{padding:0 1.5rem 5rem;max-width:80rem}}" +
    "#home-static-lcp .home-static-lcp__kicker{display:block;margin:0 0 .5rem;font:600 10px/1.2 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.7)}" +
    "#home-static-lcp .home-static-lcp__title{margin:0;font-family:Georgia,serif;font-size:2.25rem;font-weight:700;line-height:1.1;color:#fff}" +
    "@media(min-width:768px){#home-static-lcp .home-static-lcp__title{font-size:3.75rem}}" +
    "html.spa-lcp-done #home-static-lcp{opacity:0;visibility:hidden}" +
    `.home-main-overlap{margin-top:calc(-1 * max(75vh,${HOME_HERO_MIN_HEIGHT_PX}px));padding-top:4rem}` +
    "@media(min-width:768px){.home-main-overlap{padding-top:7rem}}"
  );
}

/** Compact hero — πιο πολυσυζητημένες (μικρότερο από παλιό fullscreen). */
export const HOME_HERO_COMPACT_SECTION_CLASS =
  "relative h-[52vh] min-h-[340px] max-h-[480px] overflow-hidden bg-[#13143E] max-md:-mt-16 max-md:pt-16 md:-mt-28 md:pt-28";

/** @deprecated Χρησιμοποίησε HOME_HERO_COMPACT_SECTION_CLASS */
export const HOME_HERO_SECTION_CLASS = HOME_HERO_COMPACT_SECTION_CLASS;
