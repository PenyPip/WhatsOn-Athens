import type { StrapiTheaterPerformance, StrapiVenue } from "@/lib/api";
import {
  parseShowtimeLocalDay,
  showtimeIsUpcoming,
  showtimeIsWeekBlock,
  startOfLocalDay,
} from "@/lib/showtimeSchedule";
import { resolveVenueForPerformance } from "@/lib/theaterPerformances";

export type VenueTheaterPerformanceRange = {
  from: Date;
  to: Date;
  count: number;
};

function performanceMatchesVenue(
  venue: StrapiVenue,
  p: StrapiTheaterPerformance,
  venues: StrapiVenue[],
): boolean {
  if (!showtimeIsUpcoming(p)) return false;
  const linked = resolveVenueForPerformance(p, venues);
  if (!linked) return false;
  if (Number(linked.id) === Number(venue.id)) return true;
  const wantSlug = venue.slug?.trim();
  const linkedSlug = linked.slug?.trim();
  return Boolean(wantSlug && linkedSlug && wantSlug === linkedSlug);
}

export function performancesForVenue(
  venue: StrapiVenue,
  performances: StrapiTheaterPerformance[],
  venues: StrapiVenue[],
): StrapiTheaterPerformance[] {
  if (!performances.length) return [];
  return performances.filter((p) => performanceMatchesVenue(venue, p, venues));
}

export function performancesForVenueProgramLabel(
  venue: StrapiVenue,
  performances: StrapiTheaterPerformance[],
  venues: StrapiVenue[],
): StrapiTheaterPerformance[] {
  return performancesForVenue(venue, performances, venues).filter((p) => {
    if (showtimeIsWeekBlock(p)) return false;
    return Boolean(parseShowtimeLocalDay(p.datetime));
  });
}

export function venueUpcomingTheaterPerformanceRange(
  venue: StrapiVenue,
  performances: StrapiTheaterPerformance[],
  venues: StrapiVenue[],
): VenueTheaterPerformanceRange | null {
  const slots = performancesForVenueProgramLabel(venue, performances, venues);
  if (!slots.length) return null;

  let fromDay: Date | null = null;
  let toDay: Date | null = null;
  for (const p of slots) {
    const day = parseShowtimeLocalDay(p.datetime);
    if (!day) continue;
    const local = startOfLocalDay(day);
    if (!fromDay || local.getTime() < fromDay.getTime()) fromDay = local;
    if (!toDay || local.getTime() > toDay.getTime()) toDay = local;
  }

  if (!fromDay || !toDay) return null;

  return { from: fromDay, to: toDay, count: slots.length };
}

function formatRangeDate(d: Date, withYear: boolean): string {
  return d.toLocaleDateString("el-GR", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatVenueTheaterPerformanceRangeLabel(
  range: VenueTheaterPerformanceRange | null | undefined,
): string | null {
  if (!range) return null;
  const sameDay =
    range.from.getFullYear() === range.to.getFullYear() &&
    range.from.getMonth() === range.to.getMonth() &&
    range.from.getDate() === range.to.getDate();
  const crossYear = range.from.getFullYear() !== range.to.getFullYear();
  const fromStr = formatRangeDate(range.from, crossYear);
  const toStr = formatRangeDate(range.to, crossYear);

  if (sameDay) return `Παραστάσεις: ${fromStr}`;
  return `Παραστάσεις: ${fromStr} – ${toStr}`;
}

export function buildVenueTheaterPerformanceRangeMap(
  venues: StrapiVenue[],
  performances: StrapiTheaterPerformance[],
): Map<number, VenueTheaterPerformanceRange | null> {
  const map = new Map<number, VenueTheaterPerformanceRange | null>();
  for (const venue of venues) {
    map.set(venue.id, venueUpcomingTheaterPerformanceRange(venue, performances, venues));
  }
  return map;
}
