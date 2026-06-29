import crawlData from "@/generated/spa-crawl-enrichment.json";
import { parseMoviesFilterPath } from "@/lib/moviesFilterPaths";
import { cinemaVenueProgramSeo } from "@/lib/cinemaVenueProgramSeo";
import { moviesAreaSeo, moviesGenreSeo, moviesSectionSeo } from "@/lib/moviesFilterSeo";
import { movieDetailSeo } from "@/lib/movieDetailSeo";
import { theaterVenueProgramSeo } from "@/lib/theaterVenueProgramSeo";
import type { StrapiMovie } from "@/lib/api";
import { truncateDescription } from "@/lib/siteMetadata";

export type CrawlGenre = { slug: string; label: string; href: string };
export type CrawlVenue = {
  slug: string;
  name: string;
  address?: string;
  googleMapsUrl?: string;
  moviesHref: string;
  venuesHref: string;
};
export type CrawlMovie = {
  path: string;
  slug: string;
  title: string;
  /** Μοναδικό business key — ταυτίζεται με original_title στο CMS. */
  originalTitle: string;
  genreSlugs: string[];
  genreLine?: string;
  imdbRating?: number;
  director?: string;
  posterUrl?: string;
  synopsis?: string;
  showtimeVenues?: string[];
  showtimeVenueCount?: number;
};
export type CrawlTheaterShow = {
  path: string;
  slug: string;
  title: string;
  posterUrl?: string;
  synopsis?: string;
};
export type CrawlRestaurant = { path: string; slug: string; title: string; posterUrl?: string };
export type CrawlReview = { path: string; slug: string; title: string; posterUrl?: string };
export type CrawlCulturalEvent = {
  path: string;
  slug: string;
  title: string;
  posterUrl?: string;
  synopsis?: string;
  metaDescription?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  venueName?: string;
  venueAddress?: string;
  ticketPrice?: number;
  ticketUrl?: string;
};

const data = crawlData as {
  genres: CrawlGenre[];
  venues: CrawlVenue[];
  movies: CrawlMovie[];
  theaterShows?: CrawlTheaterShow[];
  restaurants?: CrawlRestaurant[];
  reviews?: CrawlReview[];
  culturalEvents?: CrawlCulturalEvent[];
};

export const crawlEnrichment = {
  genres: data.genres ?? [],
  venues: data.venues ?? [],
  movies: data.movies ?? [],
  theaterShows: data.theaterShows ?? [],
  restaurants: data.restaurants ?? [],
  reviews: data.reviews ?? [],
  culturalEvents: data.culturalEvents ?? [],
};

function normalizePath(path: string): string {
  if (path === "" || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function crawlEntityByPath(path: string):
  | { kind: "movie"; entity: CrawlMovie }
  | { kind: "theater"; entity: CrawlTheaterShow }
  | { kind: "restaurant"; entity: CrawlRestaurant }
  | { kind: "review"; entity: CrawlReview }
  | { kind: "culturalEvent"; entity: CrawlCulturalEvent }
  | null {
  const p = normalizePath(path);
  const movie = crawlEnrichment.movies.find((m) => m.path === p);
  if (movie) return { kind: "movie", entity: movie };
  const theater = crawlEnrichment.theaterShows.find((t) => t.path === p);
  if (theater) return { kind: "theater", entity: theater };
  const restaurant = crawlEnrichment.restaurants.find((r) => r.path === p);
  if (restaurant) return { kind: "restaurant", entity: restaurant };
  const review = crawlEnrichment.reviews.find((r) => r.path === p);
  if (review) return { kind: "review", entity: review };
  const culturalEvent = crawlEnrichment.culturalEvents.find((e) => e.path === p);
  if (culturalEvent) return { kind: "culturalEvent", entity: culturalEvent };
  return null;
}

export function crawlPosterForPath(path: string): string | undefined {
  const hit = crawlEntityByPath(path);
  if (!hit) return undefined;
  return hit.entity.posterUrl;
}

export type PageSeoCopy = {
  title: string;
  description: string;
  /** Open Graph / Twitter title — χωρίς «· 37Ν» όταν οριστεί. */
  ogTitle?: string;
  ogDescription?: string;
};

/** Τίτλος/περιγραφή από build enrichment (πιο ακριβή από slug → όνομα). */
export function crawlVenueByProgramPath(path: string): CrawlVenue | null {
  const slug = path.match(/^\/movies\/venue\/([^/]+)$/)?.[1];
  if (!slug) return null;
  try {
    const decoded = decodeURIComponent(slug);
    return crawlEnrichment.venues.find((v) => v.slug === decoded) ?? null;
  } catch {
    return crawlEnrichment.venues.find((v) => v.slug === slug) ?? null;
  }
}

export function crawlVenueByTheaterProgramPath(path: string): CrawlVenue | null {
  const slug = path.match(/^\/theater\/venue\/([^/]+)$/)?.[1];
  if (!slug) return null;
  try {
    const decoded = decodeURIComponent(slug);
    return crawlEnrichment.venues.find((v) => v.slug === decoded) ?? null;
  } catch {
    return crawlEnrichment.venues.find((v) => v.slug === slug) ?? null;
  }
}

export function crawlSeoCopyForPath(path: string): PageSeoCopy | null {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const filterPath = parseMoviesFilterPath(normalized);
  if (filterPath.section) {
    const s = moviesSectionSeo(filterPath.section);
    return {
      title: s.title,
      description: s.description,
      ogTitle: s.ogTitle,
      ogDescription: s.ogDescription,
    };
  }
  if (filterPath.genreSlug) {
    const g = crawlEnrichment.genres.find((x) => x.slug === filterPath.genreSlug);
    const s = moviesGenreSeo(filterPath.genreSlug, g?.label);
    return { title: s.title, description: s.description };
  }
  if (filterPath.area) {
    const s = moviesAreaSeo(filterPath.area);
    return { title: s.title, description: s.description };
  }

  const venue = crawlVenueByProgramPath(path);
  if (venue) {
    const s = cinemaVenueProgramSeo(venue);
    return {
      title: s.title,
      description: s.description,
      ogTitle: s.ogTitle,
      ogDescription: s.ogDescription,
    };
  }

  const theaterVenue = crawlVenueByTheaterProgramPath(path);
  if (theaterVenue) {
    const s = theaterVenueProgramSeo(theaterVenue);
    return {
      title: s.title,
      description: s.description,
      ogTitle: s.ogTitle,
      ogDescription: s.ogDescription,
    };
  }

  const hit = crawlEntityByPath(path);
  if (!hit) return null;

  if (hit.kind === "movie") {
    const m = hit.entity;
    const stub = {
      title: m.title,
      originalTitle: m.originalTitle,
      synopsis: m.synopsis ?? "",
      director: m.director ?? "",
    } as StrapiMovie;
    const genreLine = m.genreLine?.trim() ?? "";
    const hint =
      m.showtimeVenues?.length || m.showtimeVenueCount
        ? {
            venueNames: m.showtimeVenues,
            venueCount: m.showtimeVenueCount ?? m.showtimeVenues?.length,
          }
        : undefined;
    const seo = movieDetailSeo(stub, genreLine, hint);
    return {
      title: seo.title,
      description: seo.description,
      ogTitle: seo.ogTitle,
      ogDescription: seo.ogDescription,
    };
  }
  if (hit.kind === "theater") {
    const s = hit.entity;
    const desc = s.synopsis?.trim()
      ? truncateDescription(`${s.title}. ${s.synopsis.trim()}`)
      : truncateDescription(`Παράσταση ${s.title} — χώρος, είδος και πληροφορίες θεάτρου.`);
    return { title: s.title, description: desc };
  }
  if (hit.kind === "restaurant") {
    return {
      title: hit.entity.title,
      description: truncateDescription(`${hit.entity.title} — εστιατόριο και τοποθεσία.`),
    };
  }
  if (hit.kind === "culturalEvent") {
    const e = hit.entity;
    const desc =
      e.metaDescription?.trim() ||
      e.synopsis?.trim() ||
      `Εκδήλωση ${e.title} — πληροφορίες, χώρος και εισιτήρια.`;
    return { title: e.title, description: truncateDescription(desc) };
  }
  return {
    title: hit.entity.title,
    description: truncateDescription(`Κριτική: ${hit.entity.title}.`),
  };
}
