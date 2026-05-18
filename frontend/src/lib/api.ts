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

/** Συγχώνευση όλων των σελίδων (Strapi maxLimit ανά σελίδα · προεπιλογή CMS συχνά 100). */
async function fetchAPIPagedEntries(endpoint: string, params: Record<string, string>): Promise<any[]> {
  const pageSize = 100;
  const aggregated: any[] = [];
  const maxPages = 40;

  for (let page = 1; page <= maxPages; page++) {
    const chunk = await fetchAPI<any[]>(endpoint, {
      ...params,
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
    });
    const rows = Array.isArray(chunk) ? chunk : [];
    if (rows.length === 0) break;
    aggregated.push(...rows);
    if (rows.length < pageSize) break;
  }

  return aggregated;
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

function mapMovieGenre(raw: unknown): StrapiMovieGenre {
  const r = unwrapStrapiEntry(raw);
  const rawId = r.id;
  let id = 0;
  if (typeof rawId === "number" && Number.isFinite(rawId)) id = rawId;
  else if (typeof rawId === "string" && rawId.trim() !== "") id = Number(rawId) || 0;
  const sortRaw = r.sort_order;
  let sortOrder = 0;
  if (typeof sortRaw === "number" && Number.isFinite(sortRaw)) sortOrder = sortRaw;
  else if (sortRaw != null && sortRaw !== "") sortOrder = Number(sortRaw) || 0;
  return {
    id,
    documentId: typeof r.documentId === "string" ? r.documentId : "",
    slug: typeof r.slug === "string" ? r.slug.trim() : "",
    label: typeof r.label === "string" ? r.label.trim() : "",
    sortOrder,
  };
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

function movieGenreFieldsFromMovie(raw: Record<string, unknown>): { genre: string; genreSlug?: string } {
  const attrs = strapiRelationAttrs(raw.movie_genre as unknown);
  if (attrs) {
    const label = typeof attrs.label === "string" ? attrs.label.trim() : "";
    const slug = typeof attrs.slug === "string" ? attrs.slug.trim() : "";
    const genre = label || (slug ? MOVIE_GENRE_LABELS[slug] ?? slug : "");
    return { genre, genreSlug: slug || undefined };
  }
  return { genre: "" };
}

/** Unwrap Strapi cast: επαναλαμβανόμενο component, παλιό JSON (array), ή string (γραμμές/κόμματα). */
export function normalizeCastFromStrapi(cast: unknown): string[] {
  if (cast == null) return [];
  if (typeof cast === "string") {
    const t = cast.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        return normalizeCastFromStrapi(JSON.parse(t) as unknown);
      } catch {
        /* πτώση για split */
      }
    }
    return t
      .split(/\r?\n|[,;·•]\s*/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(cast)) return [];
  const out: string[] = [];
  for (const item of cast) {
    if (typeof item === "string") {
      const s = item.trim();
      if (s) out.push(s);
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const unwrapped = o.attributes && typeof o.attributes === "object" ? (o.attributes as Record<string, unknown>) : o;
      const n =
        typeof unwrapped.person_name === "string"
          ? unwrapped.person_name
          : typeof unwrapped.name === "string"
            ? unwrapped.name
            : typeof o.person_name === "string"
              ? o.person_name
              : typeof o.name === "string"
                ? o.name
                : "";
      const trimmed = typeof n === "string" ? n.trim() : "";
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

function mapMovie(raw: unknown): StrapiMovie {
  const m = unwrapStrapiEntry(raw);
  const gf = movieGenreFieldsFromMovie(m as Record<string, unknown>);
  const rawId = m.id;
  let numericId = NaN;
  if (typeof rawId === "number" && Number.isFinite(rawId)) numericId = rawId;
  else if (typeof rawId === "string" && rawId.trim() !== "") numericId = Number(rawId);
  const originalTitle = typeof m.original_title === "string" ? m.original_title.trim() : "";

  return {
    id: Number.isFinite(numericId) ? numericId : 0,
    documentId: m.documentId,
    slug: m.slug,
    title: m.title,
    originalTitle: originalTitle || undefined,
    director: m.director,
    cast: normalizeCastFromStrapi(m.cast),
    genre: gf.genre,
    genreSlug: gf.genreSlug,
    duration: m.duration,
    language: m.language,
    ageRating: m.age_rating,
    synopsis: m.synopsis,
    criticScore: m.critic_score,
    releaseDate: m.release_date,
    trailerUrl: m.trailer_url,
    posterUrl: strapiMediaUrl(m.poster) ?? null,
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
    cast: normalizeCastFromStrapi(s.cast),
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

/** Σύντομο στοιχείο αίθουσας στο Venue (populate halls). */
export interface StrapiHallSummary {
  id: number;
  name: string;
}

function mapVenueHalls(rel: unknown): StrapiHallSummary[] {
  if (rel == null || typeof rel !== "object") return [];
  const raw = rel as Record<string, unknown>;
  const d = raw.data;
  const nodes = Array.isArray(d) ? d : d != null && typeof d === "object" ? [d] : [];
  const out: StrapiHallSummary[] = [];
  for (const node of nodes) {
    const attrs =
      typeof node === "object" && node !== null ? strapiRelationAttrs(node as unknown) : null;
    if (!attrs || typeof attrs.name !== "string" || !attrs.name.trim()) continue;
    const nid = typeof node === "object" && node !== null ? (node as { id?: unknown }).id : undefined;
    const idRaw = nid ?? attrs.id;
    const idNum = typeof idRaw === "number" ? idRaw : typeof idRaw === "string" ? Number(idRaw) : NaN;
    out.push({ id: Number.isFinite(idNum) ? idNum : 0, name: attrs.name.trim() });
  }
  return [...out].sort((a, b) => a.name.localeCompare(b.name, "el"));
}

function parseShowtimePrice(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return n;
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

  const hAttrs = strapiRelationAttrs(s.hall as unknown);
  const hallName =
    typeof hAttrs?.name === "string" && hAttrs.name.trim()
      ? hAttrs.name.trim()
      : typeof (s.hall as { name?: unknown } | undefined)?.name === "string"
        ? String((s.hall as { name: string }).name).trim()
        : undefined;
  const hallId = strapiRelationNumericId(s.hall as unknown);

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

  const baseId = String(s.id);
  const slots = Array.isArray(s.show_slots) ? s.show_slots : [];

  const seatsRaw = s.available_seats;
  const seatsNum =
    seatsRaw !== null && seatsRaw !== undefined && seatsRaw !== ""
      ? typeof seatsRaw === "number"
        ? seatsRaw
        : Number(seatsRaw)
      : NaN;

  const toRow = (datetime: string, index: number) => ({
    id: `${baseId}-${index}`,
    documentId: s.documentId,
    datetime,
    venue,
    venueId,
    hallId,
    hallName,
    summerScreening,
    venueSummerOutdoor,
    availableSeats: Number.isFinite(seatsNum) ? seatsNum : 0,
    price: parseShowtimePrice(s.price),
    movieId,
    movieSlug,
    movieTitle,
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

export interface StrapiMovieGenre {
  id: number;
  documentId: string;
  slug: string;
  label: string;
  sortOrder: number;
}

export interface StrapiMovie {
  id: number;
  documentId: string;
  slug: string;
  /** Ελληνικός τίτλος (slug target) — κύρια γραμμή εμφάνισης. */
  title: string;
  /** Πρωτότυπος τίτλος (π.χ. διεθνής) — δεύτερη γραμμή όταν διαφέρει και είναι συμπληρωμένος. */
  originalTitle?: string;
  director: string;
  cast: string[];
  genre: string;
  /** slug από CMS συλλογή «Είδος ταινίας» — για φίλτρα στη σελίδα Ταινίες */
  genreSlug?: string;
  duration: number;
  language: string;
  ageRating: string;
  synopsis: string;
  criticScore: number;
  releaseDate: string;
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
  price?: number;
  movieId?: number;
  movieSlug?: string;
  movieTitle?: string;
  hallId?: number;
  hallName?: string;
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
    fetchAPIPagedEntries("/movies", {
      "populate[movie_genre]": "*",
      /** Αλλιώς με ρητό populate χάνεται το media και η αφίσα επιστρέφει χωρίς url. */
      "populate[poster]": "*",
      "populate[cast]": "*",
    }).then((d) => d.map((x) => mapMovie(x))),
  getMovieBySlug: (slug: string) =>
    fetchAPI<any[]>(`/movies`, {
      "filters[slug][$eq]": slug,
      "populate[movie_genre]": "*",
      "populate[poster]": "*",
      "populate[cast]": "*",
    }).then((d) => {
      const row = Array.isArray(d) ? d[0] : undefined;
      return row ? mapMovie(row) : undefined;
    }),

  getMovieGenres: () =>
    fetchAPI<any[]>("/movie-genres", {
      "pagination[pageSize]": "100",
      "sort[0]": "sort_order:asc",
    }).then((d) => (Array.isArray(d) ? d : []).map((x) => mapMovieGenre(x))),

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
    fetchAPIPagedEntries("/showtimes", {
      "populate[movie]": "*",
      "populate[venue]": "*",
      "populate[hall]": "*",
    }).then((d) => d.flatMap((x) => mapShowtime(x))),

  getUserReviews: () =>
    fetchAPI<any[]>("/user-reviews").then((d) => (Array.isArray(d) ? d : []).map((x) => mapUserReview(x))),
};