import type { StrapiVenue } from "@/lib/api";
import { isValidExternalUrl } from "@/lib/venueResolve";
import { isTheaterVenue } from "@/lib/venueType";

/** Περιοδεία θεάτρου: χώρος τύπου θέατρο + έγκυρο more_link (URL περιοδείας/κρατήσεων). */
export function isTouringTheaterVenue(venue: Pick<StrapiVenue, "type" | "moreLink">): boolean {
  return isTheaterVenue(venue) && isValidExternalUrl(venue.moreLink);
}

export function filterTouringVenuesForHome(venues: readonly StrapiVenue[]): StrapiVenue[] {
  return venues.filter(isTouringTheaterVenue).sort((a, b) => a.name.localeCompare(b.name, "el"));
}
