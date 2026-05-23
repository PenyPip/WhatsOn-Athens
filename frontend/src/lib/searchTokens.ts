/** Κανονικοποίηση κειμένου αναζήτησης (τόνοι, πεζά). */
export function normalizeSearch(s: string): string {
  const raw = typeof s === "string" ? s : String(s ?? "");
  const t = raw.trim().toLowerCase();
  try {
    return t.normalize("NFD").replace(/\p{M}/gu, "");
  } catch {
    return t;
  }
}

const BRAND_ALIASES = new Set([
  "37",
  "37n",
  "37°n",
  "the37n",
  "the37ngr",
  "athens",
  "guide",
  "athensguide",
  "αιθήνα",
  "οδηγος",
]);

function tokenize(raw: string): string[] {
  return normalizeSearch(raw)
    .split(/[\s,.·;:!?()[\]"']+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length >= 1);
}

function isBrandToken(t: string): boolean {
  const n = t.replace(/[^\p{L}\p{N}]/gu, "");
  if (!n) return true;
  if (BRAND_ALIASES.has(n)) return true;
  if (n === "n" && tokenize("37n").length === 0) return false;
  return false;
}

/** Λέξεις-κλειδιά αναζήτησης — αγνοεί «37n», «the37n» κ.λπ. */
export function searchTokens(query: string): string[] {
  return tokenize(query).filter((t) => t.length >= 2 && !isBrandToken(t));
}

/** Όλες οι λέξεις του query (μετά φίλτρο brand) πρέπει να υπάρχουν στο haystack. */
export function textMatchesSearch(haystack: string, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const tokens = searchTokens(trimmed);
  if (tokens.length === 0) {
    const all = tokenize(trimmed).filter((t) => t.length >= 1);
    return all.every((t) => isBrandToken(t) || BRAND_ALIASES.has(t));
  }

  const hay = normalizeSearch(haystack);
  return tokens.every((t) => hay.includes(t));
}
