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
  listFlightScriptPushes,
  readStaticInlineHtml,
  replaceFlightPushAt,
} from "./flight-push-utils.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

function syncRow(html, rowId, content) {
  const pushes = listFlightScriptPushes(html);
  const declIdx = pushes.findIndex((p) => new RegExp(`^${rowId}:T[0-9a-f]+,$`).test(p.content));
  if (declIdx === -1 || declIdx + 1 >= pushes.length) return { html, changed: false };

  const newDecl = `${rowId}:T${Buffer.byteLength(content, "utf8").toString(16)},`;
  const payload = pushes[declIdx + 1];
  if (pushes[declIdx].content === newDecl && payload.content === content) {
    return { html, changed: false };
  }

  let next = replaceFlightPushAt(html, payload, content);
  const afterPayload = listFlightScriptPushes(next);
  const decl = afterPayload[declIdx];
  next = replaceFlightPushAt(next, decl, newDecl);
  return { html: next, changed: true };
}

function fixHtml(html) {
  const rowIds = collectInlineHtmlRowIds(html);
  if (!rowIds.length) return { html, changed: false };

  let next = html;
  let changed = false;
  const sorted = [...rowIds].sort((a, b) => Number(b) - Number(a));

  for (const rowId of sorted) {
    const content = readStaticInlineHtml(next, rowId);
    if (content == null) continue;
    const result = syncRow(next, rowId, content);
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
