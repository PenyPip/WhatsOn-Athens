import type { StrapiMovie, StrapiShowtime } from "@/lib/api";

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date): Date {
  const mon = startOfWeekMonday(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function isoInCalendarWeek(dt: Date, reference: Date): boolean {
  const t = dt.getTime();
  return t >= startOfWeekMonday(reference).getTime() && t <= endOfWeekSunday(reference).getTime();
}

/** Ταινίες με τουλάχιστον μία προβολή που σημαίνεται ως θερινός εξωτερικός χώρος. */
export function moviesWithSummerOutdoorShowtime(movies: StrapiMovie[], showtimes: StrapiShowtime[]): StrapiMovie[] {
  const slugsOrdered: string[] = [];
  const seen = new Set<string>();
  for (const st of showtimes) {
    if (!st.venueSummerOutdoor || !st.movieSlug) continue;
    if (seen.has(st.movieSlug)) continue;
    seen.add(st.movieSlug);
    slugsOrdered.push(st.movieSlug);
  }
  return slugsOrdered.map((slug) => movies.find((m) => m.slug === slug)).filter((m): m is StrapiMovie => Boolean(m));
}

/** Ταινίες με προβολή (ημερομηνία) μέσα στην τρέχουσα εβδομάδα (Δευ–Κυρ, τοπικά). */
export function moviesWithShowtimeThisWeek(movies: StrapiMovie[], showtimes: StrapiShowtime[], now = new Date()): StrapiMovie[] {
  const slugsOrdered: string[] = [];
  const seen = new Set<string>();
  for (const st of showtimes) {
    if (!st.movieSlug) continue;
    const dt = new Date(st.datetime);
    if (Number.isNaN(dt.getTime()) || !isoInCalendarWeek(dt, now)) continue;
    if (seen.has(st.movieSlug)) continue;
    seen.add(st.movieSlug);
    slugsOrdered.push(st.movieSlug);
  }
  return slugsOrdered.map((slug) => movies.find((m) => m.slug === slug)).filter((m): m is StrapiMovie => Boolean(m));
}

/** Ταινίες με `is_new` στο Strapi. */
export function moviesMarkedNew(movies: StrapiMovie[]): StrapiMovie[] {
  return movies.filter((m) => m.isNew === true);
}
