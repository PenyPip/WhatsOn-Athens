/**
 * Μετατρέπει blocking <link rel="stylesheet"> σε async (media=print onload)
 * ώστε το #home-static-lcp να ζωγραφίζεται (inline critical CSS) πριν το πλήρες Tailwind.
 *
 * ΜΟΝΟ στην αρχική (`index.html`): εκεί υπάρχει inline critical CSS για το hero/LCP.
 * Οι εσωτερικές σελίδες ΔΕΝ έχουν inline critical CSS — αν γίνει async το Tailwind,
 * εμφανίζεται FOUC (π.χ. αφίσα χωρίς styles πάνω-αριστερά στο hard refresh).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

const STYLESHEET_RE =
  /<link rel="stylesheet" href="(\/_next\/static\/css\/[^"]+\.css)"([^>]*)\/?>/g;

function patchSegment(html) {
  return html.replace(STYLESHEET_RE, (full, href, attrs = "") => {
    if (attrs.includes("data-async-css")) return full;
    const extra = attrs.replace(/\s*data-precedence="[^"]*"/, "").trim();
    const extraAttr = extra ? ` ${extra}` : "";
    return [
      `<link rel="preload" href="${href}" as="style" data-async-css="preload"/>`,
      `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'" data-async-css="sheet"${extraAttr}/>`,
      `<noscript><link rel="stylesheet" href="${href}"/></noscript>`,
    ].join("");
  });
}

/** Μην αγγίζουμε RSC flight payloads — αλλοιώνουν byte-length των T-rows. */
function patchHtml(html) {
  const parts = html.split(/(<script>self\.__next_f\.push\([\s\S]*?<\/script>)/g);
  return parts.map((part) => (part.startsWith("<script>self.__next_f.push") ? part : patchSegment(part))).join("");
}

try {
  const homeHtml = join(OUT, "index.html");
  const raw = readFileSync(homeHtml, "utf8");
  const next = patchHtml(raw);
  let n = 0;
  if (next !== raw) {
    writeFileSync(homeHtml, next);
    n = 1;
  }
  console.log(`[async-css] Patched ${n} HTML file(s) (home only)`);
} catch (e) {
  console.error("[async-css] Failed:", e);
  process.exit(1);
}
