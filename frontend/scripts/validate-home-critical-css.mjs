/**
 * Αποτυγχάνει το build αν η αρχική έχει #home-static-lcp αλλά το inline critical CSS
 * είναι σπασμένο (SWC/minify regression → αφίσα πάνω-αριστερά στο hard refresh).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const HOME = join(OUT, "index.html");

const REQUIRED_IF_LCP = [
  "min-height:380px",
  "min-height:580px",
  "#home-static-lcp{position:absolute;inset:0",
  "html.spa-lcp-layout-done #home-hero-slot{display:none}",
  "#home-hero-ssr-spacer{background:#13143e",
  "html.spa-lcp-layout-done #home-hero-ssr-spacer{display:block!important}",
  "calc(580px - 7rem)",
  "html.spa-lcp-done #home-hero-slot{display:none}",
  "contain:layout style paint",
  "[data-home-hero-live]{position:absolute",
  "#seo-crawl-shell{position:absolute!important",
];

const CORRUPT = [
  "min-height:380@media",
  "min-height:580.home-main-overlap",
  "calc(380px + 3.5rem)",
  'html.spa-lcp-layout-done #home-hero-ssr-spacer{display:none',
  'data-async-css="sheet"',
  'media="print" onload="this.media=\'all\'"',
];

try {
  const html = readFileSync(HOME, "utf8");
  if (!html.includes('id="home-static-lcp"')) {
    console.log("[validate-home-critical-css] Skip — no static LCP on home");
    process.exit(0);
  }

  const missing = REQUIRED_IF_LCP.filter((m) => !html.includes(m));
  const corrupt = CORRUPT.filter((m) => html.includes(m));

  if (missing.length || corrupt.length) {
    console.error("[validate-home-critical-css] FAIL — broken home hero critical CSS");
    if (missing.length) console.error("  missing:", missing.join(", "));
    if (corrupt.length) console.error("  corrupt:", corrupt.join(", "));
    process.exit(1);
  }

  console.log("[validate-home-critical-css] OK");
} catch (e) {
  console.error("[validate-home-critical-css] Failed:", e);
  process.exit(1);
}
