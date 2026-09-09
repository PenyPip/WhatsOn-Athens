/**
 * Βγάζει το `#__RQ_STATE__` JSON σε ξεχωριστό `/_rq/*.js`.
 * Το Next διπλογράφει το ίδιο payload στο RSC flight → HTML 400KB+ / TBT / mobile ~40.
 * Μετά από αυτό το sync-rq-flight συγχρονίζει T-row στο κενό `{}`.
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
  // ήδη μικρό - μην εξωτερικοποιείς (π.χ. privacy)
  if (json.length < 2048) return false;

  const key = rqKeyFromHtml(htmlPath);
  const hash = createHash("sha256").update(json).digest("hex").slice(0, 10);
  const jsRel = `/_rq/${key}.${hash}.js`;
  const jsPath = join(RQ_DIR, `${key}.${hash}.js`);
  mkdirSync(dirname(jsPath), { recursive: true });

  // Αυτόνομο blocking script - γεμίζει πριν hydrate το SpaRoot.
  const jsBody = `self.__RQ_BOOTSTRAP__=${json};`;
  writeFileSync(jsPath, jsBody);

  const attrs = m[1] || "";
  const replacement =
    `<script id="__RQ_STATE__" type="application/json"${attrs}>{}</script>` +
    `<script src="${jsRel}"></script>`;

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
  console.log(`[externalize-rq-bootstrap] Externalized ${n} HTML file(s) → out/_rq/`);
} catch (e) {
  console.error("[externalize-rq-bootstrap] Failed:", e);
  process.exit(1);
}
