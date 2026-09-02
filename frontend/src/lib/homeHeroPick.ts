import type { StrapiMovie } from "@/lib/api";

export function isMostTalkedAboutMovie(movie: StrapiMovie): boolean {
  return movie.mostTalkedAbout === true;
}

/** Ταινίες με `most_talked_about` — pool για το hero. */
export function moviesForHeroPool(movies: StrapiMovie[]): StrapiMovie[] {
  return movies.filter(isMostTalkedAboutMovie);
}

/** Νεότερη πρώτα μεταξύ πολυσυζητημένων — πεδίο CMS ή fallback timestamps. */
function mostTalkedAboutSortMs(movie: StrapiMovie): number {
  const raw = movie.mostTalkedAboutAt ?? movie.updatedAt ?? movie.createdAt;
  if (!raw || typeof raw !== "string") return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

/** Όλες οι πολυσυζητημένες για την ενότητα hero — τελευταία που προστέθηκε πρώτη. */
export function mostTalkedAboutMovies(movies: StrapiMovie[]): StrapiMovie[] {
  const flagged = moviesForHeroPool(movies);
  if (flagged.length === 0) return [];
  return [...flagged].sort((a, b) => {
    const diff = mostTalkedAboutSortMs(b) - mostTalkedAboutSortMs(a);
    if (diff !== 0) return diff;
    return b.id - a.id;
  });
}
