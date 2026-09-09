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
    if (raw[i] === "\\") {
      content += raw[i + 1] ?? "";
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
 * (React Flight κολλάει συχνά το επόμενο T-row με `n` separator, όχι μόνο `\n`).
 */
export function findFlightTRowDecl(pushes, rowId) {
  const whole = new RegExp(`^${rowId}:T[0-9a-f]+,$`);
  let declIdx = pushes.findIndex((p) => whole.test(p.content));
  if (declIdx !== -1) return { declIdx, kind: "whole" };

  // suffix: "...n27:T1744f," ή "...\n27:T1744f,"
  const suffix = new RegExp(`(?:^|[\\n])${rowId}:T[0-9a-f]+,$`);
  // επίσης plain `n` ως flight record separator
  const suffixFlightN = new RegExp(`${rowId}:T[0-9a-f]+,$`);
  declIdx = pushes.findIndex(
    (p) => !whole.test(p.content) && (suffix.test(p.content) || suffixFlightN.test(p.content)),
  );
  if (declIdx !== -1) return { declIdx, kind: "suffix" };

  return null;
}

/** Ενημερώνει μήκος T-row + payload (content = νέο inline HTML/JSON). */
export function syncFlightTRow(html, rowId, content) {
  const pushes = listFlightScriptPushes(html);
  const found = findFlightTRowDecl(pushes, rowId);
  if (!found || found.declIdx + 1 >= pushes.length) return { html, changed: false };

  const { declIdx, kind } = found;
  const newDecl = `${rowId}:T${Buffer.byteLength(content, "utf8").toString(16)},`;
  const payload = pushes[declIdx + 1];

  let declContent = pushes[declIdx].content;
  if (kind === "suffix") {
    declContent = declContent.replace(
      new RegExp(`${rowId}:T[0-9a-f]+,$`),
      newDecl,
    );
  } else {
    declContent = newDecl;
  }

  if (pushes[declIdx].content === declContent && payload.content === content) {
    return { html, changed: false };
  }

  let next = replaceFlightPushAt(html, payload, content);
  const after = listFlightScriptPushes(next);
  next = replaceFlightPushAt(next, after[declIdx], declContent);
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
