import type { StrapiMovie } from "@/lib/api";

export type MovieTitleLines = { primary: string; secondary?: string };

/**
 * Κύρια / δευτερεύουσα γραμμή τίτλου ταινίας.
 * Όταν υπάρχουν και οι δύο: ελληνικός επάνω, πρωτότυπος από κάτω.
 * Αλλιώς όποιο πεδίο είναι συμπληρωμένο, αλλιώς το legacy `title` (Strapi).
 */
export function movieTitleLines(m: Pick<StrapiMovie, "title" | "originalTitle" | "greekTitle">): MovieTitleLines {
  const legacy = (m.title ?? "").trim();
  const o = (m.originalTitle ?? "").trim();
  const g = (m.greekTitle ?? "").trim();

  if (g && o) {
    if (g === o) return { primary: g };
    return { primary: g, secondary: o };
  }
  if (g) return { primary: g };
  if (o) return { primary: o };
  return { primary: legacy || "Τίτλος" };
}

/** Για αναζήτηση: όλα τα πιθανά ονόματα. */
export function movieTitlesSearchBlob(m: Pick<StrapiMovie, "title" | "originalTitle" | "greekTitle">): string {
  const lines = movieTitleLines(m);
  const parts = new Set<string>();
  for (const x of [m.title, m.greekTitle, m.originalTitle, lines.primary, lines.secondary]) {
    const t = typeof x === "string" ? x.trim() : "";
    if (t) parts.add(t);
  }
  return [...parts].join(" ");
}
