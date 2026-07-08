import type { StrapiShowtime } from "@/lib/api";
import {
  formatShowtimeWeekRangeLabel,
  showtimeIsUpcoming,
  showtimeIsWeekBlock,
} from "@/lib/showtimeSchedule";

export function showtimeSlotKey(st: StrapiShowtime): string {
  const movie = st.movieId ?? st.movieSlug ?? st.movieTitle ?? "";
  const hall = st.hallId ?? st.hallName ?? "";
  return `${movie}|${st.datetime}|${hall}`;
}

export function uniqueShowtimeSlots(list: StrapiShowtime[]): StrapiShowtime[] {
  const seen = new Set<string>();
  const out: StrapiShowtime[] = [];
  for (const st of list) {
    const key = showtimeSlotKey(st);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(st);
  }
  return out;
}

function compareShowtimesByFavoriteVenueThenTime(
  a: StrapiShowtime,
  b: StrapiShowtime,
  favoriteVenueIds?: ReadonlySet<number>,
): number {
  if (favoriteVenueIds?.size) {
    const af = favoriteVenueIds.has(a.venueId ?? -1) ? 0 : 1;
    const bf = favoriteVenueIds.has(b.venueId ?? -1) ? 0 : 1;
    if (af !== bf) return af - bf;
  }
  return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
}

/** Επόμενη προβολή ταινίας — προτεραιότητα σε αγαπημένα σινεμά. */
export function nextShowtimeForMovie(
  movieId: number,
  showtimes: StrapiShowtime[],
  options?: { favoriteVenueIds?: ReadonlySet<number>; now?: Date },
): StrapiShowtime | null {
  const now = options?.now ?? new Date();
  const upcoming = showtimes.filter(
    (st) => st.movieId != null && Number(st.movieId) === movieId && showtimeIsUpcoming(st, now),
  );
  if (!upcoming.length) return null;
  return [...upcoming].sort((a, b) =>
    compareShowtimesByFavoriteVenueThenTime(a, b, options?.favoriteVenueIds),
  )[0];
}

export type PersonalizedVenueProgram = {
  venueId: number;
  venueName: string;
  venueSlug: string;
  movies: { movieId: number; title: string; slug: string }[];
};

/**
 * Σύνοψη «τι παίζει»: ανά αγαπημένο σινεμά, οι αγαπημένες ταινίες που έχουν μελλοντική
 * προβολή — χωρίς ώρες/ημερομηνίες. Το σινεμά με τις περισσότερες ταινίες πρώτο.
 */
export function personalizedProgramByVenue(
  showtimes: StrapiShowtime[],
  favoriteMovieIds: ReadonlySet<number>,
  favoriteVenueIds: ReadonlySet<number>,
  options?: { now?: Date },
): PersonalizedVenueProgram[] {
  if (!favoriteMovieIds.size || !favoriteVenueIds.size) return [];
  const now = options?.now ?? new Date();
  const byVenue = new Map<
    number,
    { venueId: number; venueName: string; venueSlug: string; movies: Map<string, { movieId: number; title: string; slug: string }> }
  >();

  for (const st of showtimes) {
    if (st.movieId == null || !favoriteMovieIds.has(Number(st.movieId))) continue;
    const venueId = st.venueId;
    if (venueId == null || !favoriteVenueIds.has(venueId)) continue;
    if (!showtimeIsUpcoming(st, now)) continue;

    if (!byVenue.has(venueId)) {
      byVenue.set(venueId, {
        venueId,
        venueName: st.venue,
        venueSlug: st.venueSlug ?? "",
        movies: new Map(),
      });
    }
    const group = byVenue.get(venueId)!;
    const movieKey = st.movieSlug?.trim() || String(st.movieId);
    if (!group.movies.has(movieKey)) {
      group.movies.set(movieKey, {
        movieId: Number(st.movieId),
        title: st.movieTitle ?? "",
        slug: st.movieSlug?.trim() ?? "",
      });
    }
  }

  return [...byVenue.values()]
    .map((g) => ({
      venueId: g.venueId,
      venueName: g.venueName,
      venueSlug: g.venueSlug,
      movies: [...g.movies.values()],
    }))
    .filter((g) => g.movies.length > 0)
    .sort((a, b) => b.movies.length - a.movies.length || a.venueName.localeCompare(b.venueName, "el"));
}

/** Ταινίες × αγαπημένα σινεμά — χρονολογικά. */
export function personalizedProgramShowtimes(
  showtimes: StrapiShowtime[],
  favoriteMovieIds: ReadonlySet<number>,
  favoriteVenueIds: ReadonlySet<number>,
  options?: { now?: Date; limit?: number },
): StrapiShowtime[] {
  if (!favoriteMovieIds.size || !favoriteVenueIds.size) return [];
  const now = options?.now ?? new Date();
  const filtered = showtimes.filter(
    (st) =>
      st.movieId != null &&
      favoriteMovieIds.has(Number(st.movieId)) &&
      favoriteVenueIds.has(st.venueId ?? -1) &&
      showtimeIsUpcoming(st, now),
  );
  return uniqueShowtimeSlots(filtered)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, options?.limit ?? 16);
}

export function formatNextShowtimeLabel(st: StrapiShowtime, now = new Date()): string {
  if (showtimeIsWeekBlock(st)) {
    const week = formatShowtimeWeekRangeLabel(st);
    const venue = st.venue?.trim();
    return week ? (venue ? `${week} · ${venue}` : week) : venue || "Εβδομάδα προβολών";
  }

  const d = new Date(st.datetime);
  if (Number.isNaN(d.getTime())) return st.venue?.trim() || "Προσεχώς";

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(todayStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const time = d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const venue = st.venue?.trim() || "";

  let when: string;
  if (d >= todayStart && d < tomorrowStart) when = `Σήμερα ${time}`;
  else if (d >= tomorrowStart && d < dayAfterTomorrow) when = `Αύριο ${time}`;
  else {
    when = d.toLocaleString("el-GR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return venue ? `${when} · ${venue}` : when;
}
