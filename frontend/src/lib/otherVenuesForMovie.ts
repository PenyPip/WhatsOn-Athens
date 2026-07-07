import type { StrapiShowtime, StrapiVenue } from "@/lib/api";
import type { FavoriteIdSets } from "@/lib/favoriteSort";
import { findVenueForShowtime } from "@/lib/venueResolve";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";

export type OtherVenueLink = {
  venueId: number;
  name: string;
  slug: string;
  href: string;
};

/** Άλλα σινεμά με προβολή της ίδιας ταινίας (εκτός τρέχοντος χώρου). */
export function otherVenuesForMovie(
  movieId: number,
  currentVenueId: number,
  showtimes: StrapiShowtime[],
  venues: StrapiVenue[],
  favorites?: FavoriteIdSets,
): OtherVenueLink[] {
  const seen = new Set<number>();
  const out: OtherVenueLink[] = [];
  const now = Date.now();

  for (const st of showtimes) {
    if (st.movieId == null || Number(st.movieId) !== Number(movieId)) continue;
    if (new Date(st.datetime).getTime() < now - 6 * 60 * 60 * 1000) continue;
    const venue = findVenueForShowtime(venues, st);
    if (!venue?.id || venue.id === currentVenueId) continue;
    if (seen.has(venue.id)) continue;
    seen.add(venue.id);
    const slug = venue.slug?.trim();
    if (!slug) continue;
    out.push({
      venueId: venue.id,
      name: venue.name.trim(),
      slug,
      href: moviesVenueProgramPath(slug),
    });
  }

  return out.sort((a, b) => {
    if (favorites) {
      const af = favorites.venueIds.has(a.venueId) || favorites.venueSlugs.has(a.slug.toLowerCase());
      const bf = favorites.venueIds.has(b.venueId) || favorites.venueSlugs.has(b.slug.toLowerCase());
      if (af !== bf) return af ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "el");
  });
}

export function buildOtherVenuesByMovieId(
  movieIds: number[],
  currentVenueId: number,
  showtimes: StrapiShowtime[],
  venues: StrapiVenue[],
  favorites?: FavoriteIdSets,
): Map<number, OtherVenueLink[]> {
  const map = new Map<number, OtherVenueLink[]>();
  for (const id of movieIds) {
    const links = otherVenuesForMovie(id, currentVenueId, showtimes, venues ?? [], favorites);
    if (links.length) map.set(id, links);
  }
  return map;
}
