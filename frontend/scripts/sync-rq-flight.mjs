/**
 * Διορθώνει RSC flight T-rows για inline HTML (JSON-LD, React Query bootstrap):
 * το Next διπλο-escape-άρει το περιεχόμενο στο flight push (T length ≠ payload)
 * → React «Connection closed» στο hydrate.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectInlineHtmlRowIds,
  readStaticInlineHtml,
  syncFlightTRow,
} from "./flight-push-utils.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

function fixHtml(html) {
  const rowIds = collectInlineHtmlRowIds(html);
  if (!rowIds.length) return { html, changed: false };

  let next = html;
  let changed = false;
  const sorted = [...rowIds].sort((a, b) => Number(b) - Number(a));

  for (const rowId of sorted) {
    const content = readStaticInlineHtml(next, rowId);
    if (content == null) continue;
    const result = syncFlightTRow(next, rowId, content);
    next = result.html;
    if (result.changed) changed = true;
  }

  return { html: next, changed };
}

function walk(dir) {
  let changed = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      changed += walk(full);
      continue;
    }
    if (!name.endsWith(".html")) continue;
    const raw = readFileSync(full, "utf8");
    const { html: next, changed: fileChanged } = fixHtml(raw);
    if (fileChanged) {
      writeFileSync(full, next);
      changed += 1;
    }
  }
  return changed;
}

try {
  const n = walk(OUT);
  console.log(`[sync-rq-flight] Fixed ${n} HTML file(s)`);
} catch (e) {
  console.error("[sync-rq-flight] Failed:", e);
  process.exit(1);
}
