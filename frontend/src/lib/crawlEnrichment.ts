import crawlData from "@/generated/spa-crawl-enrichment.json";
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
  genreSlugs: string[];
  posterUrl?: string;
  synopsis?: string;
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

const data = crawlData as {
  genres: CrawlGenre[];
  venues: CrawlVenue[];
  movies: CrawlMovie[];
  theaterShows?: CrawlTheaterShow[];
  restaurants?: CrawlRestaurant[];
  reviews?: CrawlReview[];
};

export const crawlEnrichment = {
  genres: data.genres ?? [],
  venues: data.venues ?? [],
  movies: data.movies ?? [],
  theaterShows: data.theaterShows ?? [],
  restaurants: data.restaurants ?? [],
  reviews: data.reviews ?? [],
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
  return null;
}

export function crawlPosterForPath(path: string): string | undefined {
  const hit = crawlEntityByPath(path);
  if (!hit) return undefined;
  return hit.entity.posterUrl;
}

/** Τίτλος/περιγραφή από build enrichment (πιο ακριβή από slug → όνομα). */
export function crawlSeoCopyForPath(path: string): { title: string; description: string } | null {
  const hit = crawlEntityByPath(path);
  if (!hit) return null;

  if (hit.kind === "movie") {
    const m = hit.entity;
    const desc = m.synopsis?.trim()
      ? truncateDescription(`${m.title}. ${m.synopsis.trim()}`)
      : truncateDescription(`Προβολές, ώρες και σινεμά για ${m.title}.`);
    return { title: m.title, description: desc };
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
  return {
    title: hit.entity.title,
    description: truncateDescription(`Κριτική: ${hit.entity.title}.`),
  };
}
