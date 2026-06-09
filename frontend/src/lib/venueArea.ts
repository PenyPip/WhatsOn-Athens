import type { StrapiVenue } from "@/lib/api";

export const VENUE_AREA_KEYS = ["athens", "thessaloniki", "other"] as const;
export type VenueAreaKey = (typeof VENUE_AREA_KEYS)[number];

export const VENUE_AREA_LABELS: Record<VenueAreaKey, string> = {
  athens: "Αθήνα",
  thessaloniki: "Θεσσαλονίκη",
  other: "Άλλο",
};

export const ATHENS_DISTRICT_KEYS = [
  "center",
  "north",
  "south",
  "west",
  "east",
  "piraeus",
  "greater_other",
] as const;
export type AthensDistrictKey = (typeof ATHENS_DISTRICT_KEYS)[number];

export const ATHENS_DISTRICT_LABELS: Record<AthensDistrictKey, string> = {
  center: "Κέντρο / κοντινά",
  north: "Βόρεια προάστια",
  south: "Νότια προάστια",
  west: "Δυτικά προάστια",
  east: "Ανατολικά προάστια",
  piraeus: "Πειραιάς",
  greater_other: "Υπόλοιπη Αττική",
};

export type VenueAreaFilter = "all" | VenueAreaKey;

export const VENUE_AREA_FILTER_OPTIONS: { value: VenueAreaFilter; label: string }[] = [
  { value: "all", label: "Όλες" },
  ...VENUE_AREA_KEYS.map((value) => ({ value, label: VENUE_AREA_LABELS[value] })),
];

/** Φίλτρο σελίδας Χώροι — μόνο περιοχές Αθήνας. */
export type AthensDistrictFilter = "all" | AthensDistrictKey;

export const ATHENS_DISTRICT_FILTER_OPTIONS: { value: AthensDistrictFilter; label: string }[] = [
  { value: "all", label: "Όλη η Αθήνα" },
  ...(ATHENS_DISTRICT_KEYS as readonly AthensDistrictKey[]).map((value) => ({
    value,
    label: ATHENS_DISTRICT_LABELS[value],
  })),
];

export function isAthensVenue(venue: Pick<StrapiVenue, "city">): boolean {
  return normalizeVenueCity(venue.city) === "athens";
}

export function normalizeVenueCity(city: string | undefined): VenueAreaKey | "" {
  const s = (city ?? "").trim().toLowerCase();
  return (VENUE_AREA_KEYS as readonly string[]).includes(s) ? (s as VenueAreaKey) : "";
}

export function parseVenueAreaParam(raw: string | null | undefined): VenueAreaKey | null {
  const v = raw?.trim().toLowerCase() ?? "";
  return (VENUE_AREA_KEYS as readonly string[]).includes(v) ? (v as VenueAreaKey) : null;
}

/** Φίλτρο πόλης σελίδας Χώροι — default Αθήνα, ρητό `area=all` για όλες τις πόλεις. */
export function parseVenueAreaFilterParam(raw: string | null | undefined): VenueAreaFilter {
  const v = raw?.trim().toLowerCase() ?? "";
  if (v === "all") return "all";
  if ((VENUE_AREA_KEYS as readonly string[]).includes(v)) return v as VenueAreaKey;
  return "athens";
}

export function parseVenueDistrictParam(raw: string | null | undefined): AthensDistrictKey | null {
  const v = raw?.trim().toLowerCase() ?? "";
  return (ATHENS_DISTRICT_KEYS as readonly string[]).includes(v) ? (v as AthensDistrictKey) : null;
}

export function venueMatchesAreaFilter(venue: Pick<StrapiVenue, "city">, area: VenueAreaKey | null): boolean {
  if (!area) return true;
  return normalizeVenueCity(venue.city) === area;
}

export function venueMatchesDistrictFilter(
  venue: Pick<StrapiVenue, "city" | "district">,
  district: AthensDistrictKey | null,
): boolean {
  if (!district) return true;
  if (normalizeVenueCity(venue.city) !== "athens") return false;
  return venue.district === district;
}

export function venueAreaLabel(venue: Pick<StrapiVenue, "city">): string {
  const key = normalizeVenueCity(venue.city);
  return key ? VENUE_AREA_LABELS[key] : (venue.city?.trim() ?? "");
}
