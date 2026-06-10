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
    const m = html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/);
    if (m) return m[1];
  }

  const rqRef = new RegExp(
    `\\\\"id\\\\":\\\\"__RQ_STATE__\\\\"[^}]*(?:\\\\"children\\\\"|\\\\"__html\\\\"):\\\\"\\$${rowId}\\\\"`,
  ).test(html);
  if (rqRef) {
    const m = html.match(/<script id="__RQ_STATE__" type="application\/json">([^<]*)<\/script>/);
    if (m) return m[1];
  }

  return null;
}
