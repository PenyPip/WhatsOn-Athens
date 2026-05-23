import type { StrapiMovie } from "@/lib/api";

export type MovieTitleLines = { primary: string; secondary?: string };

/**
 * Κύρια γραμμή = `title` (ελληνικό στο CMS). Δεύτερη = `originalTitle` όταν υπάρχει και διαφέρει.
 */
export function movieTitleLines(m: Pick<StrapiMovie, "title" | "originalTitle">): MovieTitleLines {
  const greekMain = (m.title ?? "").trim();
  const original = (m.originalTitle ?? "").trim();
  if (!greekMain && !original) return { primary: "Τίτλος" };
  if (greekMain && original && greekMain !== original) return { primary: greekMain, secondary: original };
  if (greekMain) return { primary: greekMain };
  return { primary: original };
}

/** Για αναζήτηση: όλα τα πιθανά ονόματα. */
/** Περιγραφικό alt για αφίσες ταινίας (SEO & προσβασιμότητα). */
export function posterAltForMovie(m: Pick<StrapiMovie, "title" | "originalTitle">): string {
  const tl = movieTitleLines(m);
  return tl.secondary ? `Αφίσα ταινίας «${tl.primary}» (${tl.secondary})` : `Αφίσα ταινίας «${tl.primary}»`;
}

/** Περιγραφικό alt για αφίσες θεάτρου. */
export function posterAltForTheater(title: string): string {
  const t = title.trim() || "παράσταση";
  return `Αφίσα παράστασης «${t}»`;
}

export function movieTitlesSearchBlob(m: Pick<StrapiMovie, "title" | "originalTitle" | "slug">): string {
  const lines = movieTitleLines(m);
  const parts = new Set<string>();
  for (const x of [m.title, m.originalTitle, lines.primary, lines.secondary, m.slug]) {
    const t = typeof x === "string" ? x.trim() : "";
    if (t) parts.add(t);
  }
  parts.add("37Ν");
  parts.add("37n");
  parts.add("the37n");
  return [...parts].join(" ");
}
