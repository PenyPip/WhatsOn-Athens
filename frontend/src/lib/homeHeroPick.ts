import type { ResolvedHomepageLayout } from "@/config/home";
import type { StrapiMovie, StrapiTheaterShow } from "@/lib/api";

function clampIndex(n: number, length: number): number {
  if (length <= 0) return 0;
  if (Number.isNaN(n)) return Math.min(2, Math.max(0, length - 1));
  return Math.max(0, Math.min(length - 1, n));
}

export function isMostTalkedAboutMovie(movie: StrapiMovie): boolean {
  return movie.mostTalkedAbout === true;
}

/** Ταινίες με `most_talked_about` — pool για το hero. */
export function moviesForHeroPool(movies: StrapiMovie[]): StrapiMovie[] {
  return movies.filter(isMostTalkedAboutMovie);
}

/** Όλες οι πιο συζητημένες για την ενότητα hero (ίδιο pattern με τις υπόλοιπες σειρές). */
export function mostTalkedAboutMovies(movies: StrapiMovie[]): StrapiMovie[] {
  const flagged = moviesForHeroPool(movies);
  if (flagged.length === 0) return [];
  return [...flagged].sort((a, b) => (b.criticScore ?? 0) - (a.criticScore ?? 0));
}

export type HeroPicks = {
  theater: StrapiTheaterShow | null;
  movie: StrapiMovie | null;
};

/**
 * Επιλογή hero: θέατρο από CMS priority · ταινία από `most_talked_about`
 * (προτεραιότητα `priority_movie` αν ανήκει στο pool, αλλιώς `featured_movie_list_index`).
 */
export function resolveHeroPicks(
  layout: ResolvedHomepageLayout,
  movies: StrapiMovie[],
  theaterShows: StrapiTheaterShow[],
): HeroPicks {
  const theaterSlug = layout.heroTheaterSlug ?? undefined;
  const movieSlug = layout.heroMovieSlug ?? undefined;

  let theater: StrapiTheaterShow | null = null;
  let movie: StrapiMovie | null = null;

  if (theaterSlug) {
    theater = theaterShows.find((s) => s.slug === theaterSlug) ?? null;
  }

  const talkedPool = moviesForHeroPool(movies);
  const moviePool = talkedPool.length > 0 ? talkedPool : movies;

  if (!theater && movieSlug) {
    movie = moviePool.find((m) => m.slug === movieSlug) ?? null;
    if (!movie && talkedPool.length > 0) {
      movie = movies.find((m) => m.slug === movieSlug && isMostTalkedAboutMovie(m)) ?? null;
    }
  }

  if (!theater && !movie && moviePool.length > 0) {
    const idx = clampIndex(layout.featuredMovieIndex, moviePool.length);
    movie = moviePool[idx] ?? moviePool[0] ?? null;
  }

  return { theater, movie };
}
