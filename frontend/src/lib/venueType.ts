import type { StrapiVenue } from "@/lib/api";

/** Τύπος χώρου στο CMS (`venue.type`). */
export type VenueKind = "cinema" | "theater";

export const VENUE_KIND_LABELS: Record<VenueKind, string> = {
  cinema: "Σινεμά",
  theater: "Θέατρο",
};

export type VenueKindFilter = "all" | VenueKind;

export const VENUE_KIND_FILTER_OPTIONS: { value: VenueKindFilter; label: string }[] = [
  { value: "all", label: "Όλα" },
  { value: "cinema", label: VENUE_KIND_LABELS.cinema },
  { value: "theater", label: VENUE_KIND_LABELS.theater },
];

export function parseVenueKindFilterParam(raw: string | null | undefined): VenueKindFilter {
  const v = raw?.trim().toLowerCase();
  if (v === "cinema" || v === "theater") return v;
  return "all";
}

export function venueMatchesKindFilter(venue: Pick<StrapiVenue, "type">, filter: VenueKindFilter): boolean {
  if (filter === "all") return true;
  return venue.type === filter;
}

const LEGACY_CINEMA = /σινεμ|cinema/i;
const LEGACY_THEATER = /θεατρ|theatre|theater/i;

/** Κανονικοποίηση παλιών τιμών κειμένου ή enumeration. */
export function normalizeVenueKind(raw: unknown): VenueKind | undefined {
  if (raw === "cinema" || raw === "theater") return raw;
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return undefined;
  if (LEGACY_THEATER.test(s)) return "theater";
  if (LEGACY_CINEMA.test(s)) return "cinema";
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

export function programHrefForVenue(venue: Pick<StrapiVenue, "slug" | "type">): string | undefined {
  const slug = venue.slug?.trim();
  if (!slug) return undefined;
  if (venue.type === "cinema") return `/movies/venue/${encodeURIComponent(slug)}`;
  if (venue.type === "theater") return "/theater";
  return undefined;
}

export function programLinkLabelForVenue(venue: Pick<StrapiVenue, "type">): string {
  return venue.type === "theater"
    ? "Παραστάσεις σε αυτόν τον χώρο"
    : "Πρόγραμμα ταινιών σε αυτόν τον χώρο";
}
