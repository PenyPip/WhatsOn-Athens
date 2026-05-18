import type { MappedHomepage, HomeSectionId } from "@/config/home";
import { FALLBACK_SECTIONS, normalizeHomeSectionId } from "@/config/home";

const API_PREFIX = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

function homepageRelationSlug(rel: unknown): string | null {
  if (rel === null || rel === undefined) return null;
  const r = rel as Record<string, unknown>;
  const d = r.data as unknown;
  if (d !== null && d !== undefined) {
    const row = Array.isArray(d) ? d[0] : d;
    if (row && typeof row === "object") {
      const inner = row as Record<string, unknown>;
      const attrs = inner.attributes as Record<string, unknown> | undefined;
      const slug = (attrs?.slug ?? inner.slug) as unknown;
      if (typeof slug === "string" && slug) return slug;
    }
  }
  const top = r.slug as unknown;
  return typeof top === "string" && top ? top : null;
}

function mapHomepageLayoutSections(layoutSections: unknown): HomeSectionId[] {
  if (!Array.isArray(layoutSections)) return [];

  const out: HomeSectionId[] = [];
  const seen = new Set<string>();
  for (const row of layoutSections) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    if (o.visible === false) continue;

    const kRaw = (o.section_key ?? o.identifier) as unknown;
    const k = typeof kRaw === "string" ? kRaw.trim() : "";
    const norm = normalizeHomeSectionId(k);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

function mapHomeAttributes(attrs: Record<string, unknown>): MappedHomepage {
  const sections = mapHomepageLayoutSections(attrs.layout_sections);
  const idxRaw = attrs.featured_movie_list_index;
  let featuredMovieIndex = 2;
  if (typeof idxRaw === "number" && Number.isFinite(idxRaw)) {
    featuredMovieIndex = idxRaw;
  } else if (idxRaw !== null && idxRaw !== undefined) {
    const p = parseInt(String(idxRaw), 10);
    if (Number.isFinite(p)) featuredMovieIndex = p;
  }

  const resolvedSections = sections.length > 0 ? sections : [...FALLBACK_SECTIONS];

  return {
    sections: resolvedSections,
    heroTheaterSlug: homepageRelationSlug(attrs.priority_theater_show),
    heroMovieSlug: homepageRelationSlug(attrs.priority_movie),
    featuredMovieIndex,
  };
}

function apiRequestBaseUrl(): string {
  /** Origin περιλαμβάνει θύρα (:3000)· χωρίς αυτό τα `/api` χτυπάνε λάθος host (π.χ. :80) και «σβήνει» όλη η αρχική. */
  if (API_PREFIX.startsWith("http://") || API_PREFIX.startsWith("https://")) return API_PREFIX;
  return window.location.origin;
}

async function fetchAPI<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_PREFIX}${endpoint}`, apiRequestBaseUrl());
  let hasExplicitPopulate = false;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (k === "populate" || k.startsWith("populate[")) hasExplicitPopulate = true;
      url.searchParams.set(k, v);
    }
  }
  if (!hasExplicitPopulate) url.searchParams.set("populate", "*");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data ?? json;
}

const MOVIE_GENRE_LABELS: Record<string, string> = {
  action: "Δράση",
  adventure: "Περιπέτεια",
  animation: "Κινούμενα Σχέδια",
  comedy: "Κωμωδία",
  documentary: "Ντοκιμαντέρ",
  drama: "Δράμα",
  fantasy: "Φαντασία",
  horror: "Τρόμος",
  musical: "Μιούζικαλ",
  romance: "Ρομάντζο",
  "sci-fi": "Επιστημονική Φαντασία",
  thriller: "Θρίλερ",
  other: "Άλλο",
};

function movieGenreLabel(apiGenre: string | undefined): string {
  if (!apiGenre) return "";
  return MOVIE_GENRE_LABELS[apiGenre] || apiGenre;
}

function normalizeUploadedUrl(raw: string | undefined | null): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  return raw.replace("http://localhost:1337", "").replace("http://strapi:1337", "");
}

/** Επίπεδο Strapi `{ id, attributes }` → πεδία στο επάνω επίπεδο */
function unwrapStrapiEntry(raw: unknown): any {
  if (raw === null || raw === undefined || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const attrs = o.attributes;
  if (attrs !== null && typeof attrs === "object") {
    return { ...(attrs as Record<string, unknown>), id: o.id, documentId: o.documentId };
  }
  return raw;
}

/** Media field Strapi REST (flat ή `{ data: { attributes: { url } } }`) */
function strapiMediaUrl(media: unknown): string | undefined {
  if (!media || typeof media !== "object") return undefined;
  const o = media as Record<string, unknown>;
  if (typeof o.url === "string") return normalizeUploadedUrl(o.url);
  const d = o.data;
  let urlCandidate: unknown;
  if (d !== null && d !== undefined && typeof d === "object") {
    const node = d as Record<string, unknown>;
    const inner = typeof node.attributes === "object" && node.attributes !== null ? (node.attributes as Record<string, unknown>) : node;
    urlCandidate = inner.url ?? node.url;
  }
  const u = typeof urlCandidate === "string" ? normalizeUploadedUrl(urlCandidate) : undefined;
  return u || undefined;
}

function mapMovie(raw: unknown): StrapiMovie {
  const m = unwrapStrapiEntry(raw);
  const rawId = m.id;
  let numericId = NaN;
  if (typeof rawId === "number" && Number.isFinite(rawId)) numericId = rawId;
  else if (typeof rawId === "string" && rawId.trim() !== "") numericId = Number(rawId);
  return {
    id: Number.isFinite(numericId) ? numericId : 0,
    documentId: m.documentId,
    slug: m.slug,
    title: m.title,
    director: m.director,
    cast: m.cast || [],
    genre: movieGenreLabel(m.genre),
    duration: m.duration,
    language: m.language,
    ageRating: m.age_rating,
    synopsis: m.synopsis,
    criticScore: m.critic_score,
    releaseDate: m.release_date,
    isNew: m.is_new === true,
    trailerUrl: m.trailer_url,
    posterUrl: strapiMediaUrl(m.poster) ?? normalizeUploadedUrl(m.poster_url) ?? null,
  };
}

function mapTheaterShow(raw: unknown): StrapiTheaterShow {
  const s = unwrapStrapiEntry(raw);
  const vAttrs = strapiRelationAttrs(s.venue as unknown);
  const venue =
    typeof vAttrs?.name === "string" && vAttrs.name
      ? vAttrs.name
      : typeof s.venue === "string"
        ? s.venue
        : "";

  return {
    id: s.id,
    documentId: s.documentId,
    slug: s.slug,
    title: s.title,
    director: s.director,
    cast: s.cast || [],
    genre: s.genre,
    duration: s.duration,
    venue,
    synopsis: s.synopsis,
    tags: s.tags || [],
    posterUrl: strapiMediaUrl(s.poster) ?? undefined,
    gradientFrom: s.gradient_from || "#2c3e50",
    gradientTo: s.gradient_to || "#8e44ad",
    isPremiere: s.is_premiere,
    isLastShows: s.is_last_shows,
  };
}

function mapRestaurant(raw: unknown): StrapiRestaurant {
  const r = unwrapStrapiEntry(raw);
  return {
    id: r.id,
    documentId: r.documentId,
    slug: r.slug,
    name: r.name,
    synopsis: r.synopsis,
    cuisine: r.cuisine,
    neighborhood: r.neighborhood,
    city: r.city,
    priceRange: r.price_range,
    address: r.address,
    phone: r.phone,
    website: r.website,
    instagram: r.instagram,
    openingDate: r.opening_date,
    isNew: r.is_new,
    posterUrl: strapiMediaUrl(r.poster) ?? undefined,
    gradientFrom: r.gradient_from || "#1a1a2e",
    gradientTo: r.gradient_to || "#e8a020",
    editorialScore: r.editorial_score,
    editorialReview: r.editorial_review,
    editorialAuthor: r.editorial_author,
  };
}

function mapEditorialReview(raw: unknown): StrapiEditorialReview {
  const r = unwrapStrapiEntry(raw);
  return {
    id: r.id,
    documentId: r.documentId,
    slug: r.slug,
    title: r.title,
    body: r.body,
    score: r.score,
    author: r.author,
    authorImageUrl: r.author_image_url,
    category: r.category,
    contentTitle: r.movie?.title || r.theater_show?.title || r.restaurant?.name || "",
    featuredImageGradientFrom: r.featured_image_gradient_from,
    featuredImageGradientTo: r.featured_image_gradient_to,
    publishedAt: r.publishedAt,
  };
}

/** Strapi REST v4: σχέση ως επίπεδο αντικείμενο ή ως `{ data: { attributes } }` */
function strapiRelationAttrs(rel: unknown): Record<string, unknown> | null {
  if (rel == null || typeof rel !== "object") return null;
  const o = rel as Record<string, unknown>;
  if ("data" in o) {
    const d = o.data;
    if (d == null) return null;
    const node = Array.isArray(d) ? d[0] : d;
    if (!node || typeof node !== "object") return null;
    const n = node as Record<string, unknown>;
    if (n.attributes && typeof n.attributes === "object") return n.attributes as Record<string, unknown>;
    return n;
  }
  if (o.attributes && typeof o.attributes === "object") return o.attributes as Record<string, unknown>;
  return o;
}

function strapiRelationNumericId(rel: unknown): number | undefined {
  const asNum = (x: unknown): number | undefined => {
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (typeof x === "string" && x.trim() !== "") {
      const n = Number(x);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };
  if (rel == null || typeof rel !== "object") return undefined;
  const o = rel as Record<string, unknown>;
  if ("data" in o) {
    const d = o.data;
    if (d == null) return undefined;
    const node = Array.isArray(d) ? d[0] : d;
    if (node && typeof node === "object") return asNum((node as { id?: unknown }).id);
    return undefined;
  }
  return asNum(o.id);
}

/** Ανοιχτός/θερινός χώρος από πεδία Strapi ή heuristics σε όνομα/τύπο */
export function venueLooksSummerOutdoor(attrs: Record<string, unknown>): boolean {
  const flag = attrs.summer_outdoor ?? attrs.summerOutdoor;
  if (flag === true || flag === "true" || flag === 1) return true;

  const typePattern =
    /θεριν|ύπαιθρ|υπαιθρ|αιθρί|αίθρι|ανοιχτ|εξωτερικ|αλς|open\s*-?\s*air|(?:^|\s)summer(?:\s|$)|outdoor|drive\s*-?\s*in/i;

  const nm = attrs.name;
  if (typeof nm === "string" && typePattern.test(nm)) return true;

  const raw = attrs.type;
  if (typeof raw === "string" && raw.trim() && typePattern.test(raw)) return true;

  return false;
}

function mapShowtime(rawS: any): StrapiShowtime[] {
  const s = unwrapStrapiEntry(rawS);
  const ss = s.summer_screening;
  const summerScreening = ss === true || ss === "true" || ss === 1;
  const venueId = strapiRelationNumericId(s.venue as unknown);
  const vAttrs = strapiRelationAttrs(s.venue as unknown);
  const venue =
    typeof vAttrs?.name === "string" && vAttrs.name
      ? vAttrs.name
      : typeof s.venue === "string"
        ? s.venue
        : "";
  const venueSummerOutdoor = Boolean(vAttrs && venueLooksSummerOutdoor(vAttrs));

  const mAttrs = strapiRelationAttrs(s.movie as unknown);
  const movieSlug =
    typeof mAttrs?.slug === "string"
      ? mAttrs.slug
      : typeof s.movie?.slug === "string"
        ? s.movie.slug
        : undefined;
  const movieTitle =
    typeof mAttrs?.title === "string"
      ? mAttrs.title
      : typeof s.movie?.title === "string"
        ? s.movie.title
        : undefined;
  const movieId = strapiRelationNumericId(s.movie as unknown);

  const thAttrs = strapiRelationAttrs(s.theater_show as unknown);
  const theaterShowSlug =
    typeof thAttrs?.slug === "string"
      ? thAttrs.slug
      : typeof s.theater_show?.slug === "string"
        ? s.theater_show.slug
        : undefined;

  const baseId = String(s.id);
  const slots = Array.isArray(s.show_slots) ? s.show_slots : [];

  const toRow = (datetime: string, index: number) => ({
    id: `${baseId}-${index}`,
    documentId: s.documentId,
    datetime,
    venue,
    venueId,
    summerScreening,
    venueSummerOutdoor,
    availableSeats: s.available_seats,
    price: typeof s.price === "number" ? s.price : Number(s.price ?? 0),
    movieId,
    movieSlug,
    movieTitle,
    theaterShowSlug,
  });

  if (slots.length > 0) {
    return slots.filter((slot: any) => !!slot?.datetime).map((slot: any, index: number) => toRow(slot.datetime, index));
  }

  return s.datetime ? [toRow(s.datetime, 0)] : [];
}

function mapUserReview(raw: unknown): StrapiUserReview {
  const r = unwrapStrapiEntry(raw);
  return {
    id: r.id,
    documentId: r.documentId,
    userName: r.user_name,
    rating: r.rating,
    body: r.body,
    contentType: r.content_type,
    contentTitle: r.content_title || "",
    createdAt: r.createdAt,
  };
}

function mapVenue(raw: unknown): StrapiVenue {
  const v = unwrapStrapiEntry(raw);
  const rawId = v.id;
  let vid = 0;
  if (typeof rawId === "number" && Number.isFinite(rawId)) vid = rawId;
  else if (typeof rawId === "string" && rawId.trim() !== "") vid = Number(rawId) || 0;
  const soRaw = v.summer_outdoor;
  const summerOutdoor = soRaw === true || soRaw === "true" || soRaw === 1;
  return {
    id: vid,
    documentId: v.documentId,
    slug: v.slug,
    name: v.name,
    address: v.address,
    city: v.city,
    googleMapsUrl: v.google_maps_url,
    moreLink: typeof v.more_link === "string" ? v.more_link.trim() : "",
    seatsTotal: v.seats_total,
    type: v.type || "",
    summerOutdoor,
  };
}

export interface StrapiMovie {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  director: string;
  cast: string[];
  genre: string;
  duration: number;
  language: string;
  ageRating: string;
  synopsis: string;
  criticScore: number;
  releaseDate: string;
  /** Strapi πεδίο is_new — για μπλοκ «Νέες ταινίες» στην αρχική */
  isNew?: boolean;
  trailerUrl?: string;
  posterUrl?: string;
}

export interface StrapiTheaterShow {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  director: string;
  cast: string[];
  genre: string;
  duration: number;
  venue: string;
  synopsis: string;
  tags: string[];
  posterUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  isPremiere?: boolean;
  isLastShows?: boolean;
}

export interface StrapiRestaurant {
  id: number;
  documentId: string;
  slug: string;
  name: string;
  synopsis: string;
  cuisine: string;
  neighborhood: string;
  city: string;
  priceRange: string;
  address: string;
  phone?: string;
  website?: string;
  instagram?: string;
  openingDate: string;
  isNew: boolean;
  posterUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  editorialScore?: number;
  editorialReview?: string;
  editorialAuthor?: string;
}

export interface StrapiVenue {
  id: number;
  documentId: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  googleMapsUrl: string;
  /** ιστότοπος / κρατήσεις — εμφανίζεται ως «Περισσότερα» */
  moreLink: string;
  seatsTotal: number;
  type: string;
  summerOutdoor: boolean;
}

export interface StrapiEditorialReview {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  body: string;
  score?: number;
  author: string;
  authorImageUrl?: string;
  category: "movie" | "theater" | "restaurant";
  contentTitle: string;
  featuredImageGradientFrom?: string;
  featuredImageGradientTo?: string;
  publishedAt: string;
}

export interface StrapiShowtime {
  id: string;
  documentId: string;
  datetime: string;
  venue: string;
  /** όταν η σχέση venue υπάρχει αλλά δεν ήρθαν attributes στο REST */
  venueId?: number;
  /** ρητό πεδίο CMS: εμφάνιση στην ενότητα «Θερινά σινεμά» */
  summerScreening: boolean;
  /** από το συνδεδεμένο venue (boolean / heuristics όνομα–τύπος) */
  venueSummerOutdoor: boolean;
  availableSeats: number;
  price: number;
  movieId?: number;
  movieSlug?: string;
  movieTitle?: string;
  /** όταν η προβολή είναι για παράσταση θεάτρου */
  theaterShowSlug?: string;
}

export interface StrapiUserReview {
  id: number;
  documentId: string;
  userName: string;
  rating: number;
  body: string;
  contentType: string;
  contentTitle: string;
  createdAt: string;
}

async function fetchHomepage(): Promise<MappedHomepage | null> {
  const url = new URL(`${API_PREFIX}/homepage`, apiRequestBaseUrl());
  url.searchParams.set("populate", "layout_sections,priority_movie,priority_theater_show");
  const res = await fetch(url.toString());
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as unknown;
  const root = json as { data?: { attributes?: Record<string, unknown> } };
  const attrs = root?.data?.attributes;
  if (!attrs) return null;
  return mapHomeAttributes(attrs);
}

export const api = {
  getHomepage: () => fetchHomepage(),

  getMovies: () =>
    fetchAPI<any[]>("/movies").then((d) => (Array.isArray(d) ? d : []).map((x) => mapMovie(x))),
  getMovieBySlug: (slug: string) =>
    fetchAPI<any[]>(`/movies`, { "filters[slug][$eq]": slug }).then((d) => {
      const row = Array.isArray(d) ? d[0] : undefined;
      return row ? mapMovie(row) : undefined;
    }),

  getTheaterShows: () =>
    fetchAPI<any[]>("/theater-shows").then((d) => (Array.isArray(d) ? d : []).map((x) => mapTheaterShow(x))),
  getTheaterShowBySlug: (slug: string) =>
    fetchAPI<any[]>(`/theater-shows`, { "filters[slug][$eq]": slug }).then((d) => {
      const row = Array.isArray(d) ? d[0] : undefined;
      return row ? mapTheaterShow(row) : undefined;
    }),

  getRestaurants: () =>
    fetchAPI<any[]>("/restaurants").then((d) => (Array.isArray(d) ? d : []).map((x) => mapRestaurant(x))),
  getRestaurantBySlug: (slug: string) =>
    fetchAPI<any[]>(`/restaurants`, { "filters[slug][$eq]": slug }).then((d) => {
      const row = Array.isArray(d) ? d[0] : undefined;
      return row ? mapRestaurant(row) : undefined;
    }),

  getVenues: () =>
    fetchAPI<any[]>("/venues").then((d) => (Array.isArray(d) ? d : []).map((x) => mapVenue(x))),

  getEditorialReviews: () =>
    fetchAPI<any[]>("/editorial-reviews").then((d) => (Array.isArray(d) ? d : []).map((x) => mapEditorialReview(x))),
  getEditorialReviewBySlug: (slug: string) =>
    fetchAPI<any[]>(`/editorial-reviews`, { "filters[slug][$eq]": slug }).then((d) => {
      const row = Array.isArray(d) ? d[0] : undefined;
      return row ? mapEditorialReview(row) : undefined;
    }),

  getShowtimes: () =>
    fetchAPI<any[]>("/showtimes", {
      "populate[movie]": "*",
      "populate[venue]": "*",
      "populate[theater_show]": "*",
    }).then((d) => (Array.isArray(d) ? d : []).flatMap((x) => mapShowtime(x))),

  getUserReviews: () =>
    fetchAPI<any[]>("/user-reviews").then((d) => (Array.isArray(d) ? d : []).map((x) => mapUserReview(x))),
};