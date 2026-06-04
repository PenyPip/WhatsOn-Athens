/** Inline styles από CKEditor που χαλάνε τη στήλη / στοίχιση στο frontend. */
const LAYOUT_STYLE_DROP =
  /^(?:text-align|float|width|max-width|margin(?:-left|-right|-top|-bottom)?|display|clear)\s*:/i;

/** Αφαιρεί float, width, text-align κ.λπ. από HTML ώστε να ελέγχει το CSS μας. */
export function normalizeArticleLayoutHtml(html: string): string {
  let out = html.replace(/\sstyle="([^"]*)"/gi, (_match, styleBody: string) => {
    const kept = styleBody
      .split(";")
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk && !LAYOUT_STYLE_DROP.test(chunk));
    return kept.length ? ` style="${kept.join("; ")}"` : "";
  });

  out = out.replace(/\sclass="([^"]*)"/gi, (_m, cls: string) => {
    const next = cls
      .split(/\s+/)
      .filter((c) => c && !/^image-style-/i.test(c) && c !== "image_resized");
    return next.length ? ` class="${next.join(" ")}"` : "";
  });

  return out;
}

/** Αν το CMS έστειλε HTML (CKEditor), το χρησιμοποιούμε ως έχει· αλλιώς απλό Markdown → HTML. */
export function articleContentToHtml(raw: string | undefined | null): string {
  const content = typeof raw === "string" ? raw.trim() : "";
  if (!content) return "";

  const html = looksLikeHtml(content) ? content : markdownToHtml(content);
  return normalizeArticleLayoutHtml(html);
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ελαφρύ Markdown για παλιά άρθρα (πριν το CKEditor). */
function markdownToHtml(md: string): string {
  const blocks = md.split(/\n{2,}/);
  const htmlBlocks: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      htmlBlocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const lines = trimmed.split("\n").map((line) => `<p>${inlineMarkdown(line)}</p>`);
    htmlBlocks.push(lines.join(""));
  }

  return htmlBlocks.join("\n");
}

function inlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  out = out.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?])/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return out;
}
