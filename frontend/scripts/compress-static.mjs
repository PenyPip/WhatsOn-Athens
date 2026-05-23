/**
 * Προ-συμπίεση static export (.gz για nginx gzip_static, .br για CDN/mελλοντικό brotli).
 */
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const MIN_BYTES = 512;
const EXT = /\.(js|css|html|svg|json|txt|xml)$/i;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXT.test(name) || name.endsWith(".br") || name.endsWith(".gz")) continue;
    const raw = readFileSync(full);
    if (raw.length < MIN_BYTES) continue;
    writeFileSync(`${full}.gz`, gzipSync(raw, { level: 9 }));
    writeFileSync(
      `${full}.br`,
      brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }),
    );
  }
}

try {
  walk(OUT);
  console.log("[compress-static] Wrote .gz and .br sidecars under out/");
} catch (e) {
  console.error("[compress-static] Failed:", e);
  process.exit(1);
}
