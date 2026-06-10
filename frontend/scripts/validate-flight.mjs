/**
 * Αποτυχία build αν υπάρχουν RSC flight T-rows με λάθος μήκος (προκαλούν Connection closed).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listFlightScriptPushes } from "./flight-push-utils.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

function walk(dir, errors) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, errors);
      continue;
    }
    if (!name.endsWith(".html")) continue;
    const html = readFileSync(full, "utf8");
    if (!html.includes("__next_f")) continue;
    const pushes = listFlightScriptPushes(html);
    for (let i = 0; i < pushes.length; i += 1) {
      const m = pushes[i].content.match(/^(\d+):T([0-9a-f]+),$/);
      if (!m) continue;
      const expected = parseInt(m[2], 16);
      const actual = Buffer.byteLength(pushes[i + 1]?.content ?? "", "utf8");
      if (expected !== actual) {
        errors.push(`${full}: row ${m[1]} expected ${expected} bytes, got ${actual}`);
      }
    }
  }
}

const errors = [];
try {
  walk(OUT, errors);
  if (errors.length) {
    console.error("[validate-flight] Broken RSC flight rows:");
    for (const e of errors.slice(0, 20)) console.error(" ", e);
    if (errors.length > 20) console.error(`  … and ${errors.length - 20} more`);
    process.exit(1);
  }
  console.log("[validate-flight] OK");
} catch (e) {
  console.error("[validate-flight] Failed:", e);
  process.exit(1);
}
