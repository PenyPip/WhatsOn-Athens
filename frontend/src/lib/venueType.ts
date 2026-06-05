import type { StrapiVenue } from "@/lib/api";

/** Τύπος χώρου στο CMS (`venue.type`). */
export type VenueKind = "cinema" | "theater" | "other";

export const VENUE_KIND_LABELS: Record<VenueKind, string> = {
  cinema: "Σινεμά",
  theater: "Θέατρο",
  other: "Άλλο",
};

export type VenueKindFilter = "all" | VenueKind;

export const VENUE_KIND_FILTER_OPTIONS: { value: VenueKindFilter; label: string }[] = [
  { value: "all", label: "Όλα" },
  { value: "cinema", label: VENUE_KIND_LABELS.cinema },
  { value: "theater", label: VENUE_KIND_LABELS.theater },
  { value: "other", label: VENUE_KIND_LABELS.other },
];

export function parseVenueKindFilterParam(raw: string | null | undefined): VenueKindFilter {
  const v = raw?.trim().toLowerCase();
  if (v === "cinema" || v === "theater" || v === "other") return v;
  return "all";
}

/** Χώροι που εμφανίζονται δημόσια (λίστες, αναζήτηση). */
export function isPublicVenueListing(venue: Pick<StrapiVenue, "type">): boolean {
  return venue.type === "cinema" || venue.type === "theater" || venue.type === "other";
}

export function venueMatchesKindFilter(venue: Pick<StrapiVenue, "type">, filter: VenueKindFilter): boolean {
  if (!isPublicVenueListing(venue)) return false;
  if (filter === "all") return true;
  return venue.type === filter;
}

const LEGACY_CINEMA = /σινεμ|cinema/i;
const LEGACY_THEATER = /θεατρ|theatre|theater/i;
const LEGACY_OTHER = /πολυχώρ|μουσική\s*σκην|gallery|γκαλερ|ξενοδοχ|other|άλλο/i;

/** Κανονικοποίηση παλιών τιμών κειμένου ή enumeration. */
export function normalizeVenueKind(raw: unknown): VenueKind | undefined {
  if (raw === "cinema" || raw === "theater" || raw === "other") return raw;
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return undefined;
  if (LEGACY_THEATER.test(s)) return "theater";
  if (LEGACY_CINEMA.test(s)) return "cinema";
  if (LEGACY_OTHER.test(s)) return "other";
  return undefined;
}

export function venueKindLabel(kind: VenueKind | undefined): string {
  return kind ? VENUE_KIND_LABELS[kind] : "";
}

export function isCinemaVenue(venue: Pick<StrapiVenue, "type">): boolean {
  return venue.type === "cinema";
}

export function isTheaterVenue(venue: Pick<StrapiVenue, "type">): boolean {
  return venue.type === "theater";
}

export function isOtherVenue(venue: Pick<StrapiVenue, "type">): boolean {
  return venue.type === "other";
}

export function programHrefForVenue(venue: Pick<StrapiVenue, "slug" | "type">): string | undefined {
  const slug = venue.slug?.trim();
  if (!slug || !isCinemaVenue(venue)) return undefined;
  return `/movies/venue/${encodeURIComponent(slug)}`;
}

export function programLinkLabelForVenue(venue: Pick<StrapiVenue, "type">): string {
  return "Πρόγραμμα ταινιών σε αυτόν τον χώρο";
}
