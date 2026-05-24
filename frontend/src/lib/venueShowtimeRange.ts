import type { StrapiShowtime, StrapiVenue } from "@/lib/api";
import { showtimeIsUpcoming } from "@/lib/homeMovieFilters";
import { findVenueForShowtime, normalizeCinemaGroupName } from "@/lib/venueResolve";

export type VenueShowtimeRange = {
  from: Date;
  to: Date;
  count: number;
};

function showtimeMatchesVenue(venue: StrapiVenue, st: StrapiShowtime, venues: StrapiVenue[]): boolean {
  if (!showtimeIsUpcoming(st)) return false;
  const linked = findVenueForShowtime(venues, st);
  if (!linked) return false;
  if (Number(linked.id) === Number(venue.id)) return true;
  const venueNorm = normalizeCinemaGroupName(venue.name);
  const linkedNorm = normalizeCinemaGroupName(linked.name);
  return Boolean(venueNorm && venueNorm === linkedNorm);
}

/** Επερχόμενες προβολές ανά χώρο (ταινίες). */
export function showtimesForVenue(
  venue: StrapiVenue,
  showtimes: StrapiShowtime[],
  venues: StrapiVenue[],
): StrapiShowtime[] {
  if (!showtimes.length) return [];
  return showtimes.filter((st) => showtimeMatchesVenue(venue, st, venues));
}

export function venueUpcomingShowtimeRange(
  venue: StrapiVenue,
  showtimes: StrapiShowtime[],
  venues: StrapiVenue[],
): VenueShowtimeRange | null {
  const slots = showtimesForVenue(venue, showtimes, venues);
  if (!slots.length) return null;

  const times = slots
    .map((st) => new Date(st.datetime))
    .filter((d) => !Number.isNaN(d.getTime()))
    .map((d) => d.getTime());

  if (!times.length) return null;

  return {
    from: new Date(Math.min(...times)),
    to: new Date(Math.max(...times)),
    count: slots.length,
  };
}

function formatRangeDate(d: Date, withYear: boolean): string {
  return d.toLocaleDateString("el-GR", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/** Κείμενο για κάρτα χώρου — «Προβολές: 28 Μαΐ – 4 Ιουν 2026». */
export function formatVenueShowtimeRangeLabel(range: VenueShowtimeRange | null | undefined): string | null {
  if (!range) return null;
  const sameDay =
    range.from.getFullYear() === range.to.getFullYear() &&
    range.from.getMonth() === range.to.getMonth() &&
    range.from.getDate() === range.to.getDate();
  const crossYear = range.from.getFullYear() !== range.to.getFullYear();
  const fromStr = formatRangeDate(range.from, crossYear);
  const toStr = formatRangeDate(range.to, crossYear);

  if (sameDay) {
    return `Προβολές: ${fromStr}`;
  }
  return `Προβολές: ${fromStr} – ${toStr}`;
}

/** Map venue.id → εύρος ημερομηνιών (για /venues). */
export function buildVenueShowtimeRangeMap(
  venues: StrapiVenue[],
  showtimes: StrapiShowtime[],
): Map<number, VenueShowtimeRange | null> {
  const map = new Map<number, VenueShowtimeRange | null>();
  for (const venue of venues) {
    map.set(venue.id, venueUpcomingShowtimeRange(venue, showtimes, venues));
  }
  return map;
}
