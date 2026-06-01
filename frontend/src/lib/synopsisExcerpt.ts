/** Μικρό απόσπασμα σύνοψης για hero / κάρτες (χωρίς κοψίμο στη μέση λέξης όπου γίνεται). */
export function synopsisExcerpt(synopsis: string, maxChars = 130): string {
  const text = synopsis.trim().replace(/\s+/g, " ");
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}
