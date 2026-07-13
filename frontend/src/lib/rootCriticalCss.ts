/** Inline στο <head>/<body> πριν το async Tailwind — αποφυγή FOUC/CLS. */
export const ROOT_CRITICAL_CSS =
  ":root{--mobile-tab-bar-h:3.5rem;--mobile-safe-bottom-fixed:0px}" +
  "#home-page-title.sr-only,#seo-crawl-shell{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}" +
  ".home-main-overlap{padding-top:3.5rem}" +
  "@media(min-width:768px){.home-main-overlap{padding-top:4rem}}" +
  "@media(max-width:767px){main.min-h-screen{padding-bottom:calc(var(--mobile-tab-bar-h) + var(--mobile-safe-bottom-fixed,0px))}}";
