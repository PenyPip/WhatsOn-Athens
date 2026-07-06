import type { StrapiTheaterPerformance, StrapiTheaterShow, StrapiVenue } from "@/lib/api";
import { resolveVenueForPerformance } from "@/lib/theaterPerformances";
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
