/**
 * Μετατρέπει blocking <link rel="stylesheet"> σε async (media=print onload)
 * ώστε το #home-static-lcp και άλλο server HTML να ζωγραφίζονται πριν το πλήρες Tailwind.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

const STYLESHEET_RE =
  /<link rel="stylesheet" href="(\/_next\/static\/css\/[^"]+\.css)"([^>]*)\/?>/g;

function patchHtml(html) {
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

function walk(dir) {
  let count = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      count += walk(full);
      continue;
    }
    if (!name.endsWith(".html")) continue;
    const raw = readFileSync(full, "utf8");
    const next = patchHtml(raw);
    if (next !== raw) {
      writeFileSync(full, next);
      count += 1;
    }
  }
  return count;
}

try {
  const n = walk(OUT);
  console.log(`[async-css] Patched ${n} HTML file(s) under out/`);
} catch (e) {
  console.error("[async-css] Failed:", e);
  process.exit(1);
}
