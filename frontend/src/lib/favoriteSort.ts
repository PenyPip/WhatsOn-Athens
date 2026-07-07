import type { StrapiMovie, StrapiVenue } from "@/lib/api";
import type { UserProfile } from "@/lib/userProfile";

export type FavoriteIdSets = {
  movieIds: ReadonlySet<number>;
  venueIds: ReadonlySet<number>;
  venueSlugs: ReadonlySet<string>;
};

export const EMPTY_FAVORITE_IDS: FavoriteIdSets = {
  movieIds: new Set(),
  venueIds: new Set(),
  venueSlugs: new Set(),
};

export function favoriteIdSetsFromProfile(profile: UserProfile | null | undefined): FavoriteIdSets {
  if (!profile) return EMPTY_FAVORITE_IDS;
  const venueSlugs = new Set<string>();
  for (const v of profile.favoriteVenues ?? []) {
    const slug = v.slug?.trim().toLowerCase();
    if (slug) venueSlugs.add(slug);
  }
  return {
    movieIds: new Set((profile.favoriteMovies ?? []).map((m) => m.id)),
    venueIds: new Set((profile.favoriteVenues ?? []).map((v) => v.id)),
    venueSlugs,
  };
}

export function isFavoriteMovie(movieId: number, favorites: FavoriteIdSets): boolean {
  return favorites.movieIds.has(movieId);
}

export function isFavoriteVenue(
  venue: Pick<StrapiVenue, "id" | "slug"> | undefined,
  favorites: FavoriteIdSets,
): boolean {
  if (!venue) return false;
  if (favorites.venueIds.has(venue.id)) return true;
  const slug = venue.slug?.trim().toLowerCase();
  return Boolean(slug && favorites.venueSlugs.has(slug));
}

export type VenueGroupLike = {
  key: string;
  venue?: Pick<StrapiVenue, "id" | "slug">;
};

export function isFavoriteVenueGroup(group: VenueGroupLike, favorites: FavoriteIdSets): boolean {
  if (isFavoriteVenue(group.venue, favorites)) return true;
  const key = group.key;
  if (key.startsWith("cinema:")) {
    const slug = key.slice(7).toLowerCase();
    if (!slug.startsWith("n:") && favorites.venueSlugs.has(slug)) return true;
  }
  if (key.startsWith("v:")) {
    const id = Number(key.slice(2));
    if (Number.isFinite(id) && favorites.venueIds.has(id)) return true;
  }
  return false;
}

/** Διατηρεί τη σειρά μέσα σε αγαπημένες / μη αγαπημένες ομάδες. */
export function sortMoviesPrioritizingFavorites(
  movies: StrapiMovie[],
  favorites: FavoriteIdSets,
): StrapiMovie[] {
  if (!favorites.movieIds.size || movies.length < 2) return movies;
  const fav: StrapiMovie[] = [];
  const rest: StrapiMovie[] = [];
  for (const movie of movies) {
    (favorites.movieIds.has(movie.id) ? fav : rest).push(movie);
  }
  return [...fav, ...rest];
}

export function compareVenueGroupsByFavorites(
  a: VenueGroupLike,
  b: VenueGroupLike,
  favorites: FavoriteIdSets,
): number {
  if (!favorites.venueIds.size && !favorites.venueSlugs.size) return 0;
  const af = isFavoriteVenueGroup(a, favorites);
  const bf = isFavoriteVenueGroup(b, favorites);
  if (af === bf) return 0;
  return af ? -1 : 1;
}

export function sortVenueShowingsBlocks<T extends VenueGroupLike>(
  blocks: T[],
  favorites: FavoriteIdSets,
  thenCompare?: (a: T, b: T) => number,
): T[] {
  if ((!favorites.venueIds.size && !favorites.venueSlugs.size) || blocks.length < 2) {
    return thenCompare ? [...blocks].sort(thenCompare) : blocks;
  }
  return [...blocks].sort((a, b) => {
    const favCmp = compareVenueGroupsByFavorites(a, b, favorites);
    if (favCmp !== 0) return favCmp;
    return thenCompare ? thenCompare(a, b) : 0;
  });
}
