/**
 * Αφαιρεί διπλό dehydrated JSON από __next_f στην αρχική (υπάρχει ήδη στο #__RQ_STATE__).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const INDEX = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "index.html");

function strip(html) {
  if (!html.includes('id="__RQ_STATE__"')) return html;
  let next = html;
  let changed = false;

  const dupSpa = /4:\[\\"\$\\",\\"\$L11\\",null,\{\\\"ssrPath\\\":\\\"\/\\\",\\\"dehydratedState\\\":\{[\s\S]*?\}\}\]/g;
  const spaNext = next.replace(dupSpa, '4:[\\"$\\",\\"$L11\\",null,{\\"ssrPath\\":\\"/\\"}]');
  if (spaNext !== next) {
    next = spaNext;
    changed = true;
  }

  const dupChunk =
    /<script>self\.__next_f\.push\(\[1,"12:T[0-9a-f]+,"\]\)<\/script><script>self\.__next_f\.push\(\[1,"\{\\"mutations\\"[\s\S]*?"\]\)<\/script>/g;
  const chunkNext = next.replace(dupChunk, "");
  if (chunkNext !== next) {
    next = chunkNext;
    changed = true;
  }

  return { html: next, changed };
}

try {
  const raw = readFileSync(INDEX, "utf8");
  const { html: next, changed } = strip(raw);
  if (changed) {
    writeFileSync(INDEX, next);
    console.log("[strip-home-flight-rq] Trimmed duplicate RQ payload in index.html");
  } else {
    console.log("[strip-home-flight-rq] No changes needed");
  }
} catch (e) {
  console.error("[strip-home-flight-rq] Failed:", e);
  process.exit(1);
}
