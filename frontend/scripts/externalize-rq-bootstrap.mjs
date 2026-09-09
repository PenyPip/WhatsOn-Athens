/**
 * Βγάζει το `#__RQ_STATE__` JSON σε `/_rq/*.json` (όχι blocking script).
 * Το SpaRoot το fetch-άρει μετά το LCP / hydrate → χαμηλότερο TBT.
 * Το sync-rq-flight (μετά) μηδενίζει το RSC T-row στο `{}`.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const RQ_DIR = join(OUT, "_rq");

const RQ_SCRIPT_RE =
  /<script id="__RQ_STATE__" type="application\/json"([^>]*)>([\s\S]*?)<\/script>/;

function walkHtml(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "_next" || name === "_rq") continue;
      walkHtml(full, files);
      continue;
    }
    if (name.endsWith(".html")) files.push(full);
  }
  return files;
}

/** out/movies/foo.html → movies/foo · out/index.html → index */
function rqKeyFromHtml(htmlPath) {
  const rel = relative(OUT, htmlPath).replace(/\\/g, "/");
  if (rel === "index.html") return "index";
  return rel.replace(/\.html$/i, "");
}

function externalizeFile(htmlPath) {
  const raw = readFileSync(htmlPath, "utf8");
  const m = raw.match(RQ_SCRIPT_RE);
  if (!m) return false;
  const json = m[2].trim();
  if (!json || json === "{}") return false;
  if (json.length < 2048) return false;

  const key = rqKeyFromHtml(htmlPath);
  const hash = createHash("sha256").update(json).digest("hex").slice(0, 10);
  const jsonRel = `/_rq/${key}.${hash}.json`;
  const jsonPath = join(RQ_DIR, `${key}.${hash}.json`);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, json);

  const attrs = m[1] || "";
  // data-rq-src: async fetch από SpaRoot. Preload ξεκινά download χωρίς να μπλοκάρει parse.
  const preload =
    key === "index"
      ? `<link rel="preload" href="${jsonRel}" as="fetch" crossorigin="anonymous"/>`
      : "";
  const replacement =
    `${preload}<script id="__RQ_STATE__" type="application/json" data-rq-src="${jsonRel}"${attrs}>{}</script>`;

  const next = raw.replace(RQ_SCRIPT_RE, replacement);
  if (next === raw) return false;
  writeFileSync(htmlPath, next);
  return true;
}

try {
  mkdirSync(RQ_DIR, { recursive: true });
  const files = walkHtml(OUT);
  let n = 0;
  for (const f of files) {
    if (externalizeFile(f)) n += 1;
  }
  console.log(`[externalize-rq-bootstrap] Externalized ${n} HTML file(s) → out/_rq/*.json`);
} catch (e) {
  console.error("[externalize-rq-bootstrap] Failed:", e);
  process.exit(1);
}
