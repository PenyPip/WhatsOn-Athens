/**
 * Post-build για την αρχική (`index.html`):
 * 1) Αφήνει το Tailwind **blocking** (όχι media=print) - το async CSS προκαλεί CLS ~0.8–1
 *    όταν το stylesheet εφαρμόζεται μετά το πρώτο paint (μέτρηση Aug 2026).
 * 2) Αφαιρεί image preloads χωρίς fetchPriority=high (κλέβουν bandwidth από LCP).
 * 3) Μεταφέρει το inline critical <style> στην αρχή του <head> για πιο γρήγορο πρώτο paint.
 *
 * Παλιό async (media=print onload) αφαιρέθηκε σκόπιμα - μη το επαναφέρεις χωρίς
 * Lighthouse mobile CLS < 0.1 μετά.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

/** Κράτα μόνο LCP image preloads. */
function stripNonLcpImagePreloads(html) {
  return html.replace(/<link\s+rel="preload"\s+as="image"[^>]*>/gi, (tag) => {
    if (/fetchpriority\s*=\s*["']high["']/i.test(tag)) return tag;
    return "";
  });
}

/**
 * Αν υπάρχει παλιό async sheet από cache/partial build, επανέφερέ το σε blocking.
 * (και καθάρισε το γνωστό bug `sheet" //>`)
 */
function restoreBlockingStylesheets(html) {
  return html
    .replace(
      /<link rel="preload" href="(\/_next\/static\/css\/[^"]+\.css)" as="style" data-async-css="preload"\s*\/?>/gi,
      "",
    )
    .replace(
      /<link rel="stylesheet" href="(\/_next\/static\/css\/[^"]+\.css)" media="print" onload="this\.media='all'" data-async-css="sheet"[^>]*>/gi,
      '<link rel="stylesheet" href="$1"/>',
    )
    .replace(/<noscript><link rel="stylesheet" href="\/_next\/static\/css\/[^"]+"\/?><\/noscript>/gi, "");
}

/** Βάλε το πρώτο inline <style> αμέσως μετά το <head>… */
function hoistCriticalStyle(html) {
  const headOpen = html.match(/<head[^>]*>/i);
  if (!headOpen) return html;
  const styleMatch = html.match(/<style[^>]*>[\s\S]*?<\/style>/i);
  if (!styleMatch) return html;
  const styleTag = styleMatch[0];
  // Μόνο αν περιέχει hero/crawl critical
  if (!styleTag.includes("#home-hero-ssr-spacer") && !styleTag.includes("#seo-crawl-shell")) {
    return html;
  }
  const without = html.replace(styleTag, "");
  const idx = without.search(/<head[^>]*>/i);
  if (idx < 0) return html;
  const end = idx + without.match(/<head[^>]*>/i)[0].length;
  return without.slice(0, end) + styleTag + without.slice(end);
}

/** Μην αγγίζουμε RSC flight payloads. */
function patchHtml(html) {
  const parts = html.split(/(<script>self\.__next_f\.push\([\s\S]*?<\/script>)/g);
  return parts
    .map((part) => {
      if (part.startsWith("<script>self.__next_f.push")) return part;
      return hoistCriticalStyle(restoreBlockingStylesheets(stripNonLcpImagePreloads(part)));
    })
    .join("");
}

try {
  const homeHtml = join(OUT, "index.html");
  const raw = readFileSync(homeHtml, "utf8");
  const next = patchHtml(raw);
  if (next !== raw) writeFileSync(homeHtml, next);

  if (/data-async-css="sheet"/i.test(next) || /media="print" onload="this\.media='all'"/i.test(next)) {
    console.error("[async-css] FAIL - async stylesheet still present on home (causes CLS)");
    process.exit(1);
  }
  if (/data-async-css="sheet"[^>]*\/\//.test(next)) {
    console.error("[async-css] FAIL - broken sheet link (//) still present");
    process.exit(1);
  }
  console.log("[async-css] Home: blocking CSS + LCP image preloads only");
} catch (e) {
  console.error("[async-css] Failed:", e);
  process.exit(1);
}
