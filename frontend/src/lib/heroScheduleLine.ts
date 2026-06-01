import type { StrapiMovie, StrapiShowtime } from "@/lib/api";
import { formatMovieReleaseDateLabel, showtimeIsUpcoming } from "@/lib/homeMovieFilters";
import { showtimeIsWeekBlock, showtimeWeekRange } from "@/lib/showtimeSchedule";

/** Αν η πλησιέστερη προβολή είναι πέρα από αυτό → εμφάνιση κυκλοφορίας (όχι ώρα προβολής). */
const HERO_NEAR_SHOWTIME_MS = 7 * 24 * 60 * 60 * 1000;

export type HeroScheduleDisplay =
  | { mode: "release"; label: string }
  | { mode: "none" };

function msUntilShowtime(st: StrapiShowtime, now: Date): number | null {
  if (showtimeIsWeekBlock(st)) {
    const range = showtimeWeekRange(st);
    if (!range) return null;
    return range.start.getTime() - now.getTime();
  }
  const t = Date.parse(st.datetime);
  if (!Number.isFinite(t)) return null;
  return t - now.getTime();
}

/** Κείμενο κάτω από σύνοψη: μόνο κυκλοφορία όταν οι προβολές είναι μακριά (>7 μέρες). */
export function resolveHeroScheduleDisplay(
  movie: StrapiMovie,
  showtimes: StrapiShowtime[],
  now = new Date(),
): HeroScheduleDisplay {
  const slug = movie.slug?.trim();
  const releaseLabel = formatMovieReleaseDateLabel(movie, now);

  let nearestMs = Infinity;

  for (const st of showtimes) {
    if (!slug || st.movieSlug !== slug) continue;
    if (!showtimeIsUpcoming(st, now)) continue;
    const ms = msUntilShowtime(st, now);
    if (ms == null || ms < 0) continue;
    if (ms < nearestMs) nearestMs = ms;
  }

  if (nearestMs <= HERO_NEAR_SHOWTIME_MS) {
    return { mode: "none" };
  }

  if (releaseLabel) return { mode: "release", label: `Κυκλοφορία · ${releaseLabel}` };
  return { mode: "none" };
}

export function heroMovieCta(slug: string): { label: string; to: string } {
  return { label: "Προβολές", to: `/movies/${slug}#showtimes` };
}
