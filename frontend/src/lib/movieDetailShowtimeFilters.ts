import type { StrapiShowtime, StrapiVenue } from "@/lib/api";
import {
  endOfLocalDay,
  showtimeOverlapsRange,
  type ScheduleSlot,
} from "@/lib/showtimeSchedule";
import {
  ATHENS_DISTRICT_KEYS,
  type AthensDistrictKey,
  type VenueAreaKey,
  normalizeVenueCity,
  venueMatchesAreaFilter,
  venueMatchesDistrictFilter,
} from "@/lib/venueArea";
import { findVenueForShowtime } from "@/lib/venueResolve";

export type MovieDetailDayFilter = "all" | "today" | "tomorrow" | "weekend";

export const MOVIE_DETAIL_DAY_FILTER_OPTIONS: { value: MovieDetailDayFilter; label: string }[] = [
  { value: "all", label: "Όλες" },
  { value: "today", label: "Σήμερα" },
  { value: "tomorrow", label: "Αύριο" },
  { value: "weekend", label: "ΣΚ" },
];

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function showtimeMatchesLocalDay(st: ScheduleSlot, day: Date, now = new Date()): boolean {
  const dayStart = startOfLocalDay(day);
  const dayEnd = endOfLocalDay(dayStart);
  return showtimeOverlapsRange(st, dayStart, dayEnd, now);
}

export function showtimeMatchesTomorrow(st: ScheduleSlot, now = new Date()): boolean {
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  return showtimeMatchesLocalDay(st, tomorrowStart, now);
}

/** Επερχόμενο Σαββατοκύριακο (Σάββατο + Κυριακή) — τοπική μέρα. */
export function upcomingWeekendDays(now = new Date()): Date[] {
  const todayStart = startOfLocalDay(now);
  const dow = todayStart.getDay();

  if (dow === 0) return [new Date(todayStart)];
  if (dow === 6) {
    const sun = new Date(todayStart);
    sun.setDate(sun.getDate() + 1);
    return [new Date(todayStart), sun];
  }

  const untilSat = 6 - dow;
  const sat = new Date(todayStart);
  sat.setDate(sat.getDate() + untilSat);
  const sun = new Date(sat);
  sun.setDate(sun.getDate() + 1);
  return [sat, sun];
}

export function showtimeMatchesWeekend(st: ScheduleSlot, now = new Date()): boolean {
  return upcomingWeekendDays(now).some((day) => showtimeMatchesLocalDay(st, day, now));
}

export function showtimeMatchesMovieDetailDayFilter(
  st: StrapiShowtime,
  filter: MovieDetailDayFilter,
  now = new Date(),
): boolean {
  if (filter === "all") return true;
  if (filter === "today") return showtimeMatchesLocalDay(st, now, now);
  if (filter === "tomorrow") return showtimeMatchesTomorrow(st, now);
  return showtimeMatchesWeekend(st, now);
}

export function showtimeMatchesMovieDetailArea(
  st: StrapiShowtime,
  area: VenueAreaKey | null,
  venues: StrapiVenue[] | undefined,
): boolean {
  if (!area) return true;
  const venue = findVenueForShowtime(venues, st);
  if (!venue) return false;
  return venueMatchesAreaFilter(venue, area);
}

export function showtimeMatchesMovieDetailDistrict(
  st: StrapiShowtime,
  district: AthensDistrictKey | null,
  venues: StrapiVenue[] | undefined,
): boolean {
  if (!district) return true;
  const venue = findVenueForShowtime(venues, st);
  if (!venue) return false;
  return venueMatchesDistrictFilter(venue, district);
}

export type MovieDetailShowtimeFilterOptions = {
  dayFilters: MovieDetailDayFilter[];
  areas: VenueAreaKey[];
  districts: AthensDistrictKey[];
};

export function movieDetailShowtimeFilterOptions(
  showtimes: StrapiShowtime[],
  venues: StrapiVenue[] | undefined,
  now = new Date(),
): MovieDetailShowtimeFilterOptions {
  const dayFilters = new Set<MovieDetailDayFilter>(["all"]);
  const areas = new Set<VenueAreaKey>();
  const districts = new Set<AthensDistrictKey>();

  for (const st of showtimes) {
    if (showtimeMatchesLocalDay(st, now, now)) dayFilters.add("today");
    if (showtimeMatchesTomorrow(st, now)) dayFilters.add("tomorrow");
    if (showtimeMatchesWeekend(st, now)) dayFilters.add("weekend");

    const venue = findVenueForShowtime(venues, st);
    if (!venue) continue;
    const area = normalizeVenueCity(venue.city);
    if (area) areas.add(area);
    if (area === "athens" && venue.district) {
      const d = venue.district as AthensDistrictKey;
      if ((ATHENS_DISTRICT_KEYS as readonly string[]).includes(d)) districts.add(d);
    }
  }

  return {
    dayFilters: MOVIE_DETAIL_DAY_FILTER_OPTIONS.map((o) => o.value).filter((v) => dayFilters.has(v)),
    areas: [...areas],
    districts: [...districts],
  };
}

export function filterMovieDetailShowtimes(
  showtimes: StrapiShowtime[],
  venues: StrapiVenue[] | undefined,
  opts: {
    dayFilter: MovieDetailDayFilter;
    areaFilter: VenueAreaKey | null;
    districtFilter: AthensDistrictKey | null;
    now?: Date;
  },
): StrapiShowtime[] {
  const now = opts.now ?? new Date();
  return showtimes.filter((st) => {
    if (!showtimeMatchesMovieDetailDayFilter(st, opts.dayFilter, now)) return false;
    if (!showtimeMatchesMovieDetailArea(st, opts.areaFilter, venues)) return false;
    if (!showtimeMatchesMovieDetailDistrict(st, opts.districtFilter, venues)) return false;
    return true;
  });
}
