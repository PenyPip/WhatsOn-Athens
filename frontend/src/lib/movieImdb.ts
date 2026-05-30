import type { StrapiMovie } from "@/lib/api";

export type MovieImdbFields = Pick<StrapiMovie, "imdbRating" | "criticScore">;

/** IMDb βαθμός — προτεραιότητα στο πεδίο imdb_rating, fallback critic_score. */
export function resolveImdbRating(movie: MovieImdbFields | null | undefined): number | null {
  if (!movie) return null;
  const raw = movie.imdbRating ?? movie.criticScore;
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 10) / 10;
}

export function formatImdbRating(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}
