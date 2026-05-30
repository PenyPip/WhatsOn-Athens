import type { StrapiMovie } from "@/lib/api";

export type MovieTitleLines = { primary: string; secondary?: string };

/** Κανονικοποίηση original_title — ίδια λογική με Strapi lifecycle. */
export function normalizeMovieOriginalTitle(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

/** Ίδιοι τίτλοι (trim, κενά, case-insensitive). */
export function movieTitlesAreEquivalent(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeMovieOriginalTitle(a).toLocaleLowerCase("el");
  const right = normalizeMovieOriginalTitle(b).toLocaleLowerCase("el");
  return Boolean(left) && left === right;
}

/** Για meta/OG: ένα όνομα, ή «ελληνικό (πρωτότυπο)» μόνο όταν διαφέρουν. */
export function movieDisplayName(tl: MovieTitleLines): string {
  if (tl.secondary && !movieTitlesAreEquivalent(tl.primary, tl.secondary)) {
    return `${tl.primary} (${tl.secondary})`;
  }
  return tl.primary;
}

/** Μοναδικό κλειδί ταυτοποίησης (εκτός id) — case-insensitive. */
export function movieOriginalTitleKey(movie: Pick<StrapiMovie, "originalTitle">): string | null {
  const normalized = normalizeMovieOriginalTitle(movie.originalTitle);
  return normalized ? normalized.toLowerCase() : null;
}

/**
 * Κύρια γραμμή = `title` (ελληνικό στο CMS). Δεύτερη = `originalTitle` όταν υπάρχει και διαφέρει.
 * Το `originalTitle` είναι το μοναδικό business key της ταινίας.
 */
export function movieTitleLines(m: Pick<StrapiMovie, "title" | "originalTitle">): MovieTitleLines {
  const greekMain = normalizeMovieOriginalTitle(m.title);
  const original = normalizeMovieOriginalTitle(m.originalTitle);
  if (!greekMain && !original) return { primary: "Τίτλος" };
  if (greekMain && original && !movieTitlesAreEquivalent(greekMain, original)) {
    return { primary: greekMain, secondary: original };
  }
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
  for (const x of [m.originalTitle, m.title, lines.primary, lines.secondary, m.slug]) {
    const t = typeof x === "string" ? x.trim() : "";
    if (t) parts.add(t);
  }
  parts.add("37Ν");
  parts.add("37n");
  parts.add("the37n");
  return [...parts].join(" ");
}
