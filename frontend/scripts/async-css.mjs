/**
 * Μετατρέπει blocking <link rel="stylesheet"> σε async (media=print onload)
 * ώστε το #home-static-lcp να ζωγραφίζεται (inline critical CSS) πριν το πλήρες Tailwind.
 *
 * ΜΟΝΟ στην αρχική (`index.html`): εκεί υπάρχει inline critical CSS για το hero/LCP.
 * Οι εσωτερικές σελίδες ΔΕΝ έχουν inline critical CSS — αν γίνει async το Tailwind,
 * εμφανίζεται FOUC (π.χ. αφίσα χωρίς styles πάνω-αριστερά στο hard refresh).
 *
 * Επίσης: αφαιρεί image preloads χωρίς fetchPriority=high (κλέβουν bandwidth από LCP).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

/**
 * Το `([^>]*)\/?` έπιανε το `/` του self-closing → έβγαινε `data-async-css="sheet" //>`
 * στο live HTML (σπασμένο link, καθυστερημένο/αποτυχημένο Tailwind → CLS ~1).
 */
const STYLESHEET_RE =
  /<link\s+rel="stylesheet"\s+href="(\/_next\/static\/css\/[^"]+\.css)"([^>]*?)\s*\/?>/gi;

function sanitizeAttrs(attrs = "") {
  return attrs
    .replace(/\s*data-precedence="[^"]*"/gi, "")
    .replace(/\s*data-async-css="[^"]*"/gi, "")
    .replace(/\/\s*$/g, "")
    .trim();
}

function patchStylesheets(html) {
  return html.replace(STYLESHEET_RE, (full, href, attrs = "") => {
    if (/data-async-css=/i.test(full)) return full;
    const extra = sanitizeAttrs(attrs);
    const extraAttr = extra ? ` ${extra}` : "";
    return [
      `<link rel="preload" href="${href}" as="style" data-async-css="preload"/>`,
      `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'" data-async-css="sheet"${extraAttr}/>`,
      `<noscript><link rel="stylesheet" href="${href}"/></noscript>`,
    ].join("");
  });
}

/** Κράτα μόνο LCP image preloads — τα υπόλοιπα (π.χ. πρώτη κάρτα ταινίας) κλέβουν το network. */
function stripNonLcpImagePreloads(html) {
  return html.replace(/<link\s+rel="preload"\s+as="image"[^>]*>/gi, (tag) => {
    if (/fetchpriority\s*=\s*["']high["']/i.test(tag)) return tag;
    return "";
  });
}

/** Μην αγγίζουμε RSC flight payloads — αλλοιώνουν byte-length των T-rows. */
function patchHtml(html) {
  const parts = html.split(/(<script>self\.__next_f\.push\([\s\S]*?<\/script>)/g);
  return parts
    .map((part) => {
      if (part.startsWith("<script>self.__next_f.push")) return part;
      return stripNonLcpImagePreloads(patchStylesheets(part));
    })
    .join("");
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
  if (/data-async-css="sheet"[^>]*\/\//.test(next)) {
    console.error("[async-css] FAIL — broken sheet link (//) still present");
    process.exit(1);
  }
  console.log(`[async-css] Patched ${n} HTML file(s) (home only)`);
} catch (e) {
  console.error("[async-css] Failed:", e);
  process.exit(1);
}
