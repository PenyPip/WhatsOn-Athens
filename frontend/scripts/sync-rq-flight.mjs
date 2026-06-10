/**
 * Διορθώνει RSC flight rows για inline HTML (JSON-LD, React Query bootstrap):
 * το Next διπλο-escape-άρει το περιεχόμενο στο flight push (T length ≠ payload)
 * → React «Connection closed» στο hydrate.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");

function escapeFlightPushContent(content) {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

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
    pushes.push({ start, end: i + 3, content });
    idx = i + 3;
  }
  return pushes;
}

/** rowId → ακριβές κείμενο από το static <script> στο HTML. */
function collectInlineHtmlSources(html) {
  const sources = new Map();

  const rqMatch = html.match(/<script id="__RQ_STATE__" type="application\/json">([^<]*)<\/script>/);
  if (rqMatch) {
    const rqRef = html.match(/\\"id\\":\\"__RQ_STATE__\\"[^}]*\\"__html\\":\\"\$(\d+)\\"/);
    if (rqRef) sources.set(rqRef[1], rqMatch[1]);
  }

  const ldMatch = html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/);
  if (ldMatch) {
    const ldRef = html.match(
      /\\"type\\":\\"application\/ld\+json\\",\\"dangerouslySetInnerHTML\\":\{\\"__html\\":\\"\$(\d+)\\"\}/,
    );
    if (ldRef) sources.set(ldRef[1], ldMatch[1]);
  }

  return sources;
}

function syncFlightRow(pushes, rowId, content) {
  const byteLen = Buffer.byteLength(content, "utf8");
  const hexLen = byteLen.toString(16);
  const newDecl = `${rowId}:T${hexLen},`;

  let declIdx = -1;
  for (let i = 0; i < pushes.length; i += 1) {
    if (new RegExp(`^${rowId}:T[0-9a-f]+,$`).test(pushes[i].content)) {
      declIdx = i;
      break;
    }
  }
  if (declIdx === -1 || declIdx + 1 >= pushes.length) return false;

  if (pushes[declIdx].content === newDecl && pushes[declIdx + 1].content === content) {
    return false;
  }

  pushes[declIdx].content = newDecl;
  pushes[declIdx + 1].content = content;
  return true;
}

function rebuildHtml(html, pushes) {
  let next = html;
  for (let i = pushes.length - 1; i >= 0; i -= 1) {
    const p = pushes[i];
    const escaped = escapeFlightPushContent(p.content);
    next = next.slice(0, p.start) + `self.__next_f.push([1,"${escaped}"])` + next.slice(p.end);
  }
  return next;
}

function fixHtml(html) {
  const sources = collectInlineHtmlSources(html);
  if (sources.size === 0) return { html, changed: false };

  const pushes = extractPushes(html);
  let changed = false;
  for (const [rowId, content] of sources) {
    if (syncFlightRow(pushes, rowId, content)) changed = true;
  }

  if (!changed) return { html, changed: false };
  return { html: rebuildHtml(html, pushes), changed: true };
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
