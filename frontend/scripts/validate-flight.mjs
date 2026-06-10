/**
 * Αποτυχία build αν υπάρχουν RSC flight T-rows με λάθος μήκος (προκαλούν Connection closed).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

function extractPushes(html) {
  const pushes = [];
  let idx = 0;
  while (true) {
    const start = html.indexOf('self.__next_f.push([1,"', idx);
    if (start === -1) break;
    let i = start + 'self.__next_f.push([1,"'.length;
    let content = "";
    while (i < html.length) {
      const ch = html[i];
      if (ch === "\\") {
        content += html[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"' && html.slice(i, i + 3) === '"])') break;
      content += ch;
      i++;
    }
    pushes.push(content);
    idx = i + 3;
  }
  return pushes;
}

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
    const pushes = extractPushes(html);
    for (let i = 0; i < pushes.length; i += 1) {
      const m = pushes[i].match(/^(\d+):T([0-9a-f]+),$/);
      if (!m) continue;
      const expected = parseInt(m[2], 16);
      const actual = Buffer.byteLength(pushes[i + 1] ?? "", "utf8");
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
