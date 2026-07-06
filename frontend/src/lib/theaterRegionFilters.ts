import type { StrapiTheaterPerformance, StrapiTheaterShow, StrapiVenue } from "@/lib/api";
import { performanceOverlapsDateRange, resolveVenueForPerformance } from "@/lib/theaterPerformances";
import { isTouringTheaterShow } from "@/lib/theaterTours";
import { normalizeVenueCity, type VenueAreaKey } from "@/lib/venueArea";

export type TheaterRegionFilter = "all" | "athens" | "thessaloniki" | "tour";

export const THEATER_REGION_OPTIONS: { value: TheaterRegionFilter; label: string }[] = [
  { value: "all", label: "Όλες" },
  { value: "athens", label: "Αθήνα" },
  { value: "thessaloniki", label: "Θεσσαλονίκη" },
  { value: "tour", label: "Περιοδείες" },
];

function performanceVenueCity(
  p: StrapiTheaterPerformance,
  venues: StrapiVenue[],
): VenueAreaKey | "" {
  const venue = resolveVenueForPerformance(p, venues);
  return normalizeVenueCity(venue?.city);
}

function ymdToMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN;
  return new Date(y, m - 1, d).getTime();
}

/** Επικάλυψη runStart/runEnd όταν δεν υπάρχουν ατομικές προβολές στο εύρος (μόνο χωρίς φίλτρο πόλης). */
function showRunOverlapsDateRange(
  show: Pick<StrapiTheaterShow, "runStart" | "runEnd">,
  fromYmd: string,
  toYmd: string,
): boolean {
  const fromMs = fromYmd ? ymdToMs(fromYmd) : null;
  const toMs = toYmd ? ymdToMs(toYmd) : null;
  if ((fromMs != null && !Number.isFinite(fromMs)) || (toMs != null && !Number.isFinite(toMs))) return true;
  const showStart = show.runStart ? ymdToMs(show.runStart) : null;
  const showEnd = show.runEnd ? ymdToMs(show.runEnd) : null;
  const overlapStart = showStart ?? Number.NEGATIVE_INFINITY;
  const overlapEnd = showEnd ?? Number.POSITIVE_INFINITY;
  const filterStart = fromMs ?? Number.NEGATIVE_INFINITY;
  const filterEnd = toMs ?? Number.POSITIVE_INFINITY;
  return overlapStart <= filterEnd && overlapEnd >= filterStart;
}

export function theaterShowMatchesRegionFilter(
  show: StrapiTheaterShow,
  performances: StrapiTheaterPerformance[],
  venues: StrapiVenue[],
  filter: TheaterRegionFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "tour") return isTouringTheaterShow(show);
  return performances.some((p) => performanceVenueCity(p, venues) === filter);
}

/** Συνδυασμένο φίλτρο λίστας — περιοχή + ημερομηνίες στην ίδια προβολή. */
export function theaterShowMatchesListFilters(
  show: StrapiTheaterShow,
  performances: StrapiTheaterPerformance[],
  venues: StrapiVenue[],
  opts: {
    region: TheaterRegionFilter;
    fromYmd: string;
    toYmd: string;
    cityFilterReady?: boolean;
  },
): boolean {
  const { region, fromYmd, toYmd, cityFilterReady = true } = opts;
  const hasDateFilter = Boolean(fromYmd || toYmd);
  const hasCityFilter = region === "athens" || region === "thessaloniki";

  if (region === "tour" && !isTouringTheaterShow(show)) return false;
  if (!hasDateFilter && region === "all") return true;
  if (!hasDateFilter && region === "tour") return true;
  if (!hasDateFilter && hasCityFilter) {
    if (!cityFilterReady) return true;
    return theaterShowMatchesRegionFilter(show, performances, venues, region);
  }

  const matchingPerformances = performances.filter((p) => {
    if (hasDateFilter && !performanceOverlapsDateRange(p, fromYmd, toYmd)) return false;
    if (hasCityFilter) {
      if (!cityFilterReady) return true;
      if (performanceVenueCity(p, venues) !== region) return false;
    }
    return true;
  });

  if (matchingPerformances.length > 0) return true;

  if (hasDateFilter && !hasCityFilter) {
    return showRunOverlapsDateRange(show, fromYmd, toYmd);
  }

  return false;
}
