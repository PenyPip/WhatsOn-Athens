import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import { cinemaGroupKey } from "@/lib/venueResolve";

function movieKeyFromShowtime(st: StrapiShowtime): string | null {
  if (st.movieId != null && Number.isFinite(Number(st.movieId))) return `id:${Number(st.movieId)}`;
  const slug = typeof st.movieSlug === "string" ? st.movieSlug.trim() : "";
  if (slug) return `slug:${slug}`;
  return null;
}

function movieKeysForMovie(movie: StrapiMovie): string[] {
  const keys = [`id:${movie.id}`];
  const slug = typeof movie.slug === "string" ? movie.slug.trim() : "";
  if (slug) keys.push(`slug:${slug}`);
  return keys;
}

/** Αριθμός διακριτών κινηματογράφων (ομαδοποιημένων) ανά ταινία από προβολές. */
export function buildMovieCinemaCountMap(
  showtimes: StrapiShowtime[],
  venues?: StrapiVenue[],
  predicate?: (st: StrapiShowtime) => boolean,
): Map<string, number> {
  const movieToCinemas = new Map<string, Set<string>>();
  for (const st of showtimes) {
    if (predicate && !predicate(st)) continue;
    const movieKey = movieKeyFromShowtime(st);
    if (!movieKey) continue;
    const cinemaKey = cinemaGroupKey(st, venues);
    if (!movieToCinemas.has(movieKey)) movieToCinemas.set(movieKey, new Set());
    movieToCinemas.get(movieKey)!.add(cinemaKey);
  }
  const counts = new Map<string, number>();
  for (const [k, set] of movieToCinemas) counts.set(k, set.size);
  return counts;
}

export function getCinemaCountForMovie(movie: StrapiMovie, counts: Map<string, number>): number {
  for (const key of movieKeysForMovie(movie)) {
    const n = counts.get(key);
    if (n != null) return n;
  }
  return 0;
}

/** Ταινίες με περισσότερους κινηματογράφους πρώτες · ισοβαθμία: αλφαβητικά. */
export function sortMoviesByCinemaCount(
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[],
  venues?: StrapiVenue[],
  predicate?: (st: StrapiShowtime) => boolean,
): StrapiMovie[] {
  if (!movies.length || !showtimes.length) return movies;
  const counts = buildMovieCinemaCountMap(showtimes, venues, predicate);
  return [...movies].sort((a, b) => {
    const ca = getCinemaCountForMovie(a, counts);
    const cb = getCinemaCountForMovie(b, counts);
    if (cb !== ca) return cb - ca;
    return movieTitleLines(a).primary.localeCompare(movieTitleLines(b).primary, "el");
  });
}

/** Σύγκριση για entries λίστας (π.χ. Movies) όταν ήδη έχουμε showings ανά ταινία. */
export function compareMoviesByShowingVenueCount(
  a: { movie: StrapiMovie; showings: { length: number } },
  b: { movie: StrapiMovie; showings: { length: number } },
): number {
  const ca = a.showings.length;
  const cb = b.showings.length;
  if (cb !== ca) return cb - ca;
  return movieTitleLines(a.movie).primary.localeCompare(movieTitleLines(b.movie).primary, "el");
}
