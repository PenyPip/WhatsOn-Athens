import type { StrapiMovie, StrapiShowtime } from "@/lib/api";
import { formatMovieReleaseDateLabel, showtimeIsUpcoming } from "@/lib/homeMovieFilters";
import {
  formatShowtimeWeekRangeLabel,
  showtimeIsWeekBlock,
  showtimeWeekRange,
} from "@/lib/showtimeSchedule";

/** Αν η πλησιέστερη προβολή είναι πέρα από αυτό → hero δείχνει κυκλοφορία, όχι προβολή. */
const HERO_NEAR_SHOWTIME_MS = 7 * 24 * 60 * 60 * 1000;

export type HeroScheduleDisplay =
  | { mode: "release"; label: string }
  | { mode: "showtime"; label: string }
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

function formatNearestShowtimeLabel(st: StrapiShowtime): string {
  if (showtimeIsWeekBlock(st)) {
    const week = formatShowtimeWeekRangeLabel(st);
    return week ? `Προβολή · ${week}` : "Προβολή · εβδομάδα";
  }
  const d = new Date(st.datetime);
  const when = d.toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `Προβολή · ${when}, ${time}`;
}

/** Γραμμή ημερομηνίας στο hero: κυκλοφορία αν η προβολή είναι >7 μέρες, αλλιώς πρώτη κοντινή προβολή. */
export function resolveHeroScheduleDisplay(
  movie: StrapiMovie,
  showtimes: StrapiShowtime[],
  now = new Date(),
): HeroScheduleDisplay {
  const slug = movie.slug?.trim();
  const releaseLabel = formatMovieReleaseDateLabel(movie, now);

  let nearest: StrapiShowtime | null = null;
  let nearestMs = Infinity;

  for (const st of showtimes) {
    if (!slug || st.movieSlug !== slug) continue;
    if (!showtimeIsUpcoming(st, now)) continue;
    const ms = msUntilShowtime(st, now);
    if (ms == null || ms < 0) continue;
    if (ms < nearestMs) {
      nearestMs = ms;
      nearest = st;
    }
  }

  if (!nearest || nearestMs > HERO_NEAR_SHOWTIME_MS) {
    if (releaseLabel) return { mode: "release", label: `Κυκλοφορία · ${releaseLabel}` };
    return { mode: "none" };
  }

  return { mode: "showtime", label: formatNearestShowtimeLabel(nearest) };
}

export function heroCtaForSchedule(
  slug: string,
  schedule: HeroScheduleDisplay,
): { label: string; to: string } {
  const base = `/movies/${slug}`;
  if (schedule.mode === "showtime") {
    return { label: "Δες προβολές", to: `${base}#showtimes` };
  }
  return { label: "Δες λεπτομέρειες", to: base };
}
