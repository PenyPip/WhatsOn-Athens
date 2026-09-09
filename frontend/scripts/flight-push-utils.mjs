/** Κοινό parsing/replace για RSC flight pushes (ένα push ανά <script>). */

export function escapeFlightPushContent(content) {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

export function unescapeFlightPushContent(raw) {
  let content = "";
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === "\\" && i + 1 < raw.length) {
      const n = raw[i + 1];
      if (n === "n") content += "\n";
      else if (n === "r") content += "\r";
      else if (n === "t") content += "\t";
      else if (n === "\\" || n === '"') content += n;
      else content += n;
      i += 1;
      continue;
    }
    content += raw[i];
  }
  return content;
}

export function listFlightScriptPushes(html) {
  const pushes = [];
  const re = /<script>(self\.__next_f\.push[^<]*)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const inner = m[1];
    const start = inner.indexOf('[1,"');
    if (start === -1) continue;
    const rawStart = start + 4;
    const rawEnd = inner.lastIndexOf('"])');
    if (rawEnd <= rawStart) continue;
    const raw = inner.slice(rawStart, rawEnd);
    pushes.push({
      index: pushes.length,
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
      /** Raw escaped slice μέσα στο JS string - για χειρουργικά replaces χωρίς re-escape. */
      rawEscaped: raw,
      rawEscapedStart: m.index + "<script>".length + start + 4,
      rawEscapedEnd: m.index + "<script>".length + rawEnd,
      content: unescapeFlightPushContent(raw),
    });
  }
  return pushes;
}

export function replaceFlightPushAt(html, push, content) {
  const escaped = escapeFlightPushContent(content);
  const replacement = `<script>self.__next_f.push([1,"${escaped}"])</script>`;
  return html.slice(0, push.matchStart) + replacement + html.slice(push.matchEnd);
}

/**
 * Βρίσκει δήλωση `N:Thex,` - είτε ολόκληρο push είτε suffix στο τέλος άλλου chunk
 * (React Flight κολλάει συχνά το επόμενο T-row με newline separator).
 */
export function findFlightTRowDecl(pushes, rowId) {
  const whole = new RegExp(`^${rowId}:T[0-9a-f]+,$`);
  let declIdx = pushes.findIndex((p) => whole.test(p.content));
  if (declIdx !== -1) return { declIdx, kind: "whole" };

  const suffix = new RegExp(`${rowId}:T[0-9a-f]+,$`);
  declIdx = pushes.findIndex((p) => !whole.test(p.content) && suffix.test(p.content));
  if (declIdx !== -1) return { declIdx, kind: "suffix" };

  return null;
}

/**
 * Ενημερώνει μήκος T-row + payload.
 * Για suffix δηλώσεις: ΧΕΙΡΟΥΡΓΙΚΟ replace του `N:Thex,` στο raw HTML —
 * ΟΧΙ re-escape ολόκληρου του προηγούμενου chunk (έσπαγε `\n` → hydrate fail).
 */
export function syncFlightTRow(html, rowId, content) {
  const pushes = listFlightScriptPushes(html);
  const found = findFlightTRowDecl(pushes, rowId);
  if (!found || found.declIdx + 1 >= pushes.length) return { html, changed: false };

  const { declIdx, kind } = found;
  const newDecl = `${rowId}:T${Buffer.byteLength(content, "utf8").toString(16)},`;
  const payload = pushes[declIdx + 1];
  const declPush = pushes[declIdx];
  const oldDeclMatch = declPush.content.match(new RegExp(`${rowId}:T[0-9a-f]+,$`));
  if (!oldDeclMatch) return { html, changed: false };
  const oldDecl = oldDeclMatch[0];

  if (oldDecl === newDecl && payload.content === content) {
    return { html, changed: false };
  }

  // 1) Αντικατάσταση payload (συνήθως `{}` ή json-ld) - ασφαλές full replace
  let next = payload.content === content ? html : replaceFlightPushAt(html, payload, content);

  if (oldDecl === newDecl) return { html: next, changed: payload.content !== content };

  // 2) Μόνο το `N:Thex,` στο raw escaped string - χωρίς touch στο υπόλοιπο chunk
  const after = listFlightScriptPushes(next);
  const declAfter = after[declIdx];
  if (!declAfter?.rawEscaped?.includes(oldDecl)) {
    // Fallback: plain replace στο rawEscaped window
    const window = next.slice(declAfter.rawEscapedStart, declAfter.rawEscapedEnd);
    if (!window.includes(oldDecl)) return { html: next, changed: true };
  }
  const start = declAfter.rawEscapedStart;
  const end = declAfter.rawEscapedEnd;
  const rawSlice = next.slice(start, end);
  // oldDecl είναι [0-9A-Za-z:,] - ίδιο στο escaped και unescaped
  if (!rawSlice.includes(oldDecl)) return { html: next, changed: true };
  const fixedRaw = rawSlice.replace(oldDecl, newDecl);
  next = next.slice(0, start) + fixedRaw + next.slice(end);
  return { html: next, changed: true };
}

export function collectInlineHtmlRowIds(html) {
  const ids = new Set();
  const patterns = [
    /\\"children\\":\\"\$(\d+)\\"/g,
    /\\"__html\\":\\"\$(\d+)\\"/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html))) ids.add(m[1]);
  }
  return [...ids];
}

export function readStaticInlineHtml(html, rowId) {
  const ldRef = new RegExp(
    `\\\\"type\\\\":\\\\"application/ld\\+json\\\\"[^}]*(?:\\\\"children\\\\"|\\\\"__html\\\\"):\\\\"\\$${rowId}\\\\"`,
  ).test(html);
  if (ldRef) {
    const m = html.match(/<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/);
    if (m) return m[1];
  }

  const rqRef = new RegExp(
    `\\\\"id\\\\":\\\\"__RQ_STATE__\\\\"[^}]*(?:\\\\"children\\\\"|\\\\"__html\\\\"):\\\\"\\$${rowId}\\\\"`,
  ).test(html);
  if (rqRef) {
    // Επιτρέπει attrs (π.χ. suppressHydrationWarning) μεταξύ type και >
    const m = html.match(
      /<script id="__RQ_STATE__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (m) return m[1];
  }

  return null;
}
