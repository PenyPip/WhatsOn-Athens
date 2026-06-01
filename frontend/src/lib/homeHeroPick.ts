import type { StrapiMovie } from "@/lib/api";

export function isMostTalkedAboutMovie(movie: StrapiMovie): boolean {
  return movie.mostTalkedAbout === true;
}

/** Ταινίες με `most_talked_about` — pool για το hero. */
export function moviesForHeroPool(movies: StrapiMovie[]): StrapiMovie[] {
  return movies.filter(isMostTalkedAboutMovie);
}

/** Όλες οι πολυσυζητημένες για την ενότητα hero. */
export function mostTalkedAboutMovies(movies: StrapiMovie[]): StrapiMovie[] {
  const flagged = moviesForHeroPool(movies);
  if (flagged.length === 0) return [];
  return [...flagged].sort((a, b) => (b.criticScore ?? 0) - (a.criticScore ?? 0));
}
