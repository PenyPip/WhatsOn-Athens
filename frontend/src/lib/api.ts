import type { MappedHomepage, HomeSectionId } from "@/config/home";
import { FALLBACK_SECTIONS, normalizeHomeSectionId } from "@/config/home";
import { DEFAULT_SITE_NAVIGATION, type MappedSiteNavigation } from "@/config/navigation";
import { resolveSiteNavigation } from "@/lib/navigation";
import { apiRequestBaseUrl } from "@/lib/apiRequestBase";
import { normalizeMovieOriginalTitle } from "@/lib/movieTitles";
import { normalizeVenueKind, type VenueKind } from "@/lib/venueType";
import { mapVenueDayPrices, resolveShowtimePricing, type VenueDayPrice } from "@/lib/venuePricing";

const API_PREFIX = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

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

async function fetchAPI<T>(
  endpoint: string,
  params?: Record<string, string>,
  options?: { noStore?: boolean },
): Promise<T> {
  const url = new URL(`${API_PREFIX}${endpoint}`, apiRequestBaseUrl());
  let hasExplicitPopulate = false;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (k === "populate" || k.startsWith("populate[")) hasExplicitPopulate = true;
      url.searchParams.set(k, v);
    }
  }
  if (!hasExplicitPopulate) url.searchParams.set("populate", "*");

  const res = await fetch(url.toString(), options?.noStore ? { cache: "no-store" } : undefined);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data ?? json;
}

/** Πρώτη εγγραφή collection από `fetchAPI`: πίνακας ή μονή εγγραφή `{ id, attributes }`. */
function strapiCollectionFirst(data: unknown): unknown {
  if (data == null) return undefined;
  if (Array.isArray(data)) return data[0];
  if (typeof data === "object" && ("id" in data || "attributes" in data)) return data;
  return undefined;
}

/** Συγχώνευση όλων των σελίδων (Strapi maxLimit ανά σελίδα · προεπιλογή CMS συχνά 100). */
async function fetchAPIPagedEntries(
  endpoint: string,
  params: Record<string, string>,
  options?: { noStore?: boolean },
): Promise<any[]> {
  const pageSize = 100;
  const aggregated: any[] = [];
  const maxPages = 40;

  for (let page = 1; page <= maxPages; page++) {
    const chunk = await fetchAPI<any[]>(
      endpoint,
      {
        ...params,
        "pagination[page]": String(page),
        "pagination[pageSize]": String(pageSize),
      },
      options,
    );
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

/** Fallback εμφάνισης · αν `genre` από το mapMovie είναι κενό αλλά υπάρχουν slug στον τύπο. */
export function movieGenreSlugsToDisplayLine(slugs: string[] | undefined | null): string {
  if (!slugs?.length) return "";
  return slugs
    .map((s) => {
      const k = String(s).trim().toLowerCase().replace(/^\/+|\/+$/g, "");
      if (!k) return "";
      return MOVIE_GENRE_LABELS[k] ?? String(s).trim();
    })
    .filter(Boolean)
    .join(" · ");
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

type StrapiMediaAttrs = Record<string, unknown>;

function strapiMediaAttributes(media: unknown): StrapiMediaAttrs | null {
  if (!media || typeof media !== "object") return null;
  const o = media as Record<string, unknown>;
  if (typeof o.url === "string" || o.formats) return o;
  const d = o.data;
  if (d === null || d === undefined || typeof d !== "object") return null;
  const node = d as Record<string, unknown>;
  const inner =
    typeof node.attributes === "object" && node.attributes !== null
      ? (node.attributes as StrapiMediaAttrs)
      : node;
  return inner;
}

const FORMAT_FALLBACK: Record<"small" | "medium" | "large", string[]> = {
  small: ["small", "thumbnail", "medium", "large"],
  medium: ["medium", "small", "large", "thumbnail"],
  large: ["large", "medium", "small", "thumbnail"],
};

/** Media field Strapi REST — προτίμηση μικρότερων formats για LCP/PSI (κινητό). */
function strapiMediaUrl(media: unknown, prefer: "small" | "medium" | "large" = "medium"): string | undefined {
  const attrs = strapiMediaAttributes(media);
  if (!attrs) return undefined;

  const formats = attrs.formats as Record<string, { url?: string }> | undefined;
  if (formats && typeof formats === "object") {
    for (const key of FORMAT_FALLBACK[prefer]) {
      const raw = formats[key]?.url;
      if (typeof raw === "string" && raw.trim()) return normalizeUploadedUrl(raw);
    }
  }

  const direct = attrs.url;
  return typeof direct === "string" ? normalizeUploadedUrl(direct) : undefined;
}

/** srcset για hero/αφίσες όταν υπάρχουν Strapi formats. */
export function strapiPosterSrcSet(media: unknown): { src: string; srcSet?: string } | null {
  const attrs = strapiMediaAttributes(media);
  if (!attrs) return null;

  const parts: string[] = [];
  const formats = attrs.formats as Record<string, { url?: string; width?: number }> | undefined;
  if (formats && typeof formats === "object") {
    for (const key of ["thumbnail", "small", "medium", "large"] as const) {
      const entry = formats[key];
      const url = typeof entry?.url === "string" ? normalizeUploadedUrl(entry.url) : undefined;
      const w = typeof entry?.width === "number" && entry.width > 0 ? entry.width : undefined;
      if (url && w) parts.push(`${url} ${w}w`);
    }
  }

  const src =
    strapiMediaUrl(media, "small") ??
    (typeof attrs.url === "string" ? normalizeUploadedUrl(attrs.url) : undefined);
  if (!src) return null;

  return parts.length > 1 ? { src, srcSet: parts.join(", ") } : { src };
}

/** Εγγραφές σχέσης Strapi: παλιό `movie_genre` ή νέο `movie_genres` (πολλά). */
function relationDataEntries(rel: unknown): Record<string, unknown>[] {
  const pushNumericId = (out: Record<string, unknown>[], node: unknown) => {
    if (typeof node === "number" && Number.isFinite(node)) {
      out.push({ id: node });
      return true;
    }
    if (typeof node === "string" && node.trim() !== "") {
      const n = Number(node.trim());
      if (Number.isFinite(n)) {
        out.push({ id: n });
        return true;
      }
    }
    return false;
  };

  if (rel == null) return [];
  if (Array.isArray(rel)) {
    const out: Record<string, unknown>[] = [];
    for (const node of rel) {
      if (pushNumericId(out, node)) continue;
      const u = unwrapStrapiEntry(node);
      if (u && typeof u === "object" && !Array.isArray(u)) out.push(u as Record<string, unknown>);
    }
    return out;
  }
  if (typeof rel !== "object") return [];
  const o = rel as Record<string, unknown>;
  if (typeof o.label === "string" || typeof o.slug === "string") return [o];
  const d = o.data;
  if (d == null || d === false) return [];
  const nodes = Array.isArray(d) ? d : [d];
  const out: Record<string, unknown>[] = [];
  for (const node of nodes) {
    if (pushNumericId(out, node)) continue;
    const u = unwrapStrapiEntry(node);
    if (u && typeof u === "object" && !Array.isArray(u)) out.push(u as Record<string, unknown>);
  }
  return out;
}

function relationEntryNumericId(attrs: Record<string, unknown>): number | null {
  const raw = attrs.id;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Strapi: stubs σχέσης με documentId όταν δεν έχουν label/slug στο populate. */
function relationEntryDocId(attrs: Record<string, unknown>): string {
  const d = attrs.documentId;
  return typeof d === "string" && d.trim() ? d.trim() : "";
}

function relationEntrySortOrder(attrs: Record<string, unknown>): number {
  const s = attrs.sort_order;
  if (typeof s === "number" && Number.isFinite(s)) return s;
  if (s !== null && s !== undefined && s !== "") {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return 9999;
}

function genreLookupFromList(genres: StrapiMovieGenre[]): {
  byId: Map<number, StrapiMovieGenre>;
  byDoc: Map<string, StrapiMovieGenre>;
  bySlug: Map<string, StrapiMovieGenre>;
} {
  const byId = new Map<number, StrapiMovieGenre>();
  const byDoc = new Map<string, StrapiMovieGenre>();
  const bySlug = new Map<string, StrapiMovieGenre>();
  for (const g of genres) {
    if (Number.isFinite(g.id) && g.id > 0) byId.set(g.id, g);
    const doc = typeof g.documentId === "string" ? g.documentId.trim() : "";
    if (doc) byDoc.set(doc, g);
    const slug = typeof g.slug === "string" ? g.slug.trim().toLowerCase().replace(/^\/+|\/+$/g, "") : "";
    if (slug) bySlug.set(slug, g);
  }
  return { byId, byDoc, bySlug };
}

/** Αντίστροφη σχέση: από κάθε είδος → ποιες ταινίες το έχουν (όταν το populate στη ταινία λείπει). */
export type MovieGenreLinkIndex = {
  byMovieId: Map<number, StrapiMovieGenre[]>;
  byMovieSlug: Map<string, StrapiMovieGenre[]>;
};

export function buildMovieGenreLinkIndex(genreRows: unknown[]): MovieGenreLinkIndex {
  const byMovieId = new Map<number, StrapiMovieGenre[]>();
  const byMovieSlug = new Map<string, StrapiMovieGenre[]>();

  const addGenre = (map: Map<number, StrapiMovieGenre[]> | Map<string, StrapiMovieGenre[]>, key: number | string, genre: StrapiMovieGenre) => {
    const list = (map as Map<number | string, StrapiMovieGenre[]>).get(key) ?? [];
    if (!list.some((g) => g.id === genre.id)) list.push(genre);
    (map as Map<number | string, StrapiMovieGenre[]>).set(key, list);
  };

  for (const raw of genreRows) {
    const genre = mapMovieGenre(raw);
    const unwrapped = unwrapStrapiEntry(raw) as Record<string, unknown>;
    for (const mov of relationDataEntries(unwrapped.movies)) {
      const mid = relationEntryNumericId(mov);
      const slugRaw = mov.slug;
      const slug =
        typeof slugRaw === "string" ? slugRaw.trim().toLowerCase().replace(/^\/+|\/+$/g, "") : "";
      if (mid != null) addGenre(byMovieId, mid, genre);
      if (slug) addGenre(byMovieSlug, slug, genre);
    }
  }

  return { byMovieId, byMovieSlug };
}

function genresFromLinkIndex(
  movieId: number,
  movieSlug: string | undefined,
  linkIndex?: MovieGenreLinkIndex,
): { genre: string; genreSlugs: string[]; genreSlug?: string } {
  if (!linkIndex || !Number.isFinite(movieId)) {
    return { genre: "", genreSlugs: [] };
  }
  const slugKey = typeof movieSlug === "string" ? movieSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, "") : "";
  const list =
    linkIndex.byMovieId.get(movieId) ??
    (slugKey ? linkIndex.byMovieSlug.get(slugKey) : undefined) ??
    [];
  if (!list.length) return { genre: "", genreSlugs: [] };
  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "el"));
  const genreSlugs = sorted.map((g) => g.slug).filter(Boolean);
  const genre = sorted
    .map((g) => g.label.trim() || (MOVIE_GENRE_LABELS[g.slug] ?? g.slug))
    .filter(Boolean)
    .join(" · ");
  return { genre, genreSlugs, genreSlug: genreSlugs[0] };
}

export type MovieGenreCatalog = {
  genres: StrapiMovieGenre[];
  hydrate: ReturnType<typeof genreLookupFromList>;
  linkIndex: MovieGenreLinkIndex;
};

let movieGenreCatalogPromise: Promise<MovieGenreCatalog> | null = null;

/** Λίστα ειδών μόνο — χωρίς populate[movies] (έσκαγε το payload / TTFB). */
async function fetchMovieGenreCatalog(): Promise<MovieGenreCatalog> {
  if (movieGenreCatalogPromise) return movieGenreCatalogPromise;
  movieGenreCatalogPromise = (async () => {
    const rows = await fetchAPI<unknown[]>("/movie-genres", {
      "pagination[pageSize]": "100",
      "sort[0]": "sort_order:asc",
    });
    const list = Array.isArray(rows) ? rows : [];
    const genres = list.map((x) => mapMovieGenre(x));
    return {
      genres,
      hydrate: genreLookupFromList(genres),
      linkIndex: buildMovieGenreLinkIndex(list),
    };
  })().catch((err) => {
    movieGenreCatalogPromise = null;
    throw err;
  });
  return movieGenreCatalogPromise;
}

/** Γραμμή είδους για ταινία: relation → αντίστροφο index ειδών. */
export function resolveMovieGenreLine(
  movieId: number,
  movieSlug: string | undefined,
  fromMap: { genre?: string; genreSlugs?: string[] },
  linkIndex?: MovieGenreLinkIndex,
): string {
  const direct = (fromMap.genre ?? "").trim();
  if (direct) return direct;
  const fromSlugs = movieGenreSlugsToDisplayLine(fromMap.genreSlugs);
  if (fromSlugs) return fromSlugs;
  return genresFromLinkIndex(movieId, movieSlug, linkIndex).genre;
}

/**
 * Είδη ταινίας από τη σχέση CMS. Αν η Strapi επιστρέφει stubs (μόνο id / documentId) χωρίς label στη σχέση,
 * συμπληρώνουμε από `/movie-genres`.
 */
function movieGenresFromMovieRaw(
  raw: Record<string, unknown>,
  hydrate?: { byId: Map<number, StrapiMovieGenre>; byDoc: Map<string, StrapiMovieGenre>; bySlug: Map<string, StrapiMovieGenre> },
): { genre: string; genreSlug?: string; genreSlugs: string[] } {
  const alt = raw as { movieGenres?: unknown; movie_genre?: unknown; movie_genres?: unknown };
  const merged = [
    ...relationDataEntries(alt.movie_genres),
    ...relationDataEntries(alt.movieGenres),
    ...relationDataEntries(raw.movie_genre),
  ];
  type Pair = { label: string; slug: string; sortOrder: number };
  const pairs: Pair[] = [];
  const seen = new Set<string>();
  for (const attrs of merged) {
    const labelRaw = attrs.label;
    const slugRaw = attrs.slug;
    const labelTrim = typeof labelRaw === "string" ? labelRaw.trim() : "";
    let slug = typeof slugRaw === "string" ? slugRaw.trim().toLowerCase().replace(/^\/+|\/+$/g, "") : "";
    let sortOrder = relationEntrySortOrder(attrs);

    let displayLabel = labelTrim || (slug ? (MOVIE_GENRE_LABELS[slug] ?? slug) : "");

    let slugNorm =
      slug || (labelTrim ? labelTrim.toLowerCase().replace(/\s+/g, "-").replace(/^\/+|\/+$/g, "") : "");

    const rid = relationEntryNumericId(attrs);
    const docStr = relationEntryDocId(attrs);
    if (!displayLabel && hydrate) {
      let g: StrapiMovieGenre | undefined;
      if (rid != null) g = hydrate.byId.get(rid);
      if (!g && docStr) g = hydrate.byDoc.get(docStr);
      if (!g && slug) g = hydrate.bySlug.get(slug);
      if (g) {
        const gl = typeof g.label === "string" ? g.label.trim() : "";
        const gs = typeof g.slug === "string" ? g.slug.trim().toLowerCase().replace(/^\/+|\/+$/g, "") : "";
        displayLabel =
          gl || (gs ? MOVIE_GENRE_LABELS[gs] ?? gs : "") || (slug ? MOVIE_GENRE_LABELS[slug] ?? slug : "");
        slugNorm = gs || (gl ? gl.toLowerCase().replace(/\s+/g, "-").replace(/^\/+|\/+$/g, "") : slugNorm);
        sortOrder = g.sortOrder ?? sortOrder;
      }
    }

    if (!slugNorm && displayLabel) {
      slugNorm = displayLabel.toLowerCase().replace(/\s+/g, "-").replace(/^\/+|\/+$/g, "");
    }

    if (!displayLabel || !slugNorm) continue;
    if (seen.has(slugNorm)) continue;
    seen.add(slugNorm);
    pairs.push({ label: displayLabel, slug: slugNorm, sortOrder });
  }

  pairs.sort((a, b) => {
    const d = a.sortOrder - b.sortOrder;
    if (d !== 0) return d;
    return a.label.localeCompare(b.label, "el");
  });

  const genreSlugs = pairs.map((p) => p.slug);
  const genre = pairs.map((p) => p.label).join(" · ");
  return {
    genre,
    genreSlugs,
    genreSlug: genreSlugs[0],
  };
}

function mapHomeAttributes(attrs: Record<string, unknown>): MappedHomepage {
  const sections = mapHomepageLayoutSections(attrs.layout_sections);
  return {
    sections: sections.length > 0 ? sections : [...FALLBACK_SECTIONS],
  };
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

function movieIsDubbedFromRaw(m: Record<string, unknown>): boolean {
  if (m.is_dubbed === true) return true;
  const lang = typeof m.language === "string" ? m.language.toLowerCase() : "";
  return /μεταγλωτισ|μεταγλωτίσ|dubbed|\bdub\b/i.test(lang);
}

function parseOptionalDecimal(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function mapMovie(
  raw: unknown,
  hydrate?: {
    byId: Map<number, StrapiMovieGenre>;
    byDoc: Map<string, StrapiMovieGenre>;
    bySlug: Map<string, StrapiMovieGenre>;
  },
  linkIndex?: MovieGenreLinkIndex,
  posterPrefer: "small" | "medium" | "large" = "small",
): StrapiMovie {
  const m = unwrapStrapiEntry(raw);
  const gf = movieGenresFromMovieRaw(m as Record<string, unknown>, hydrate);
  const rawId = m.id;
  let numericId = NaN;
  if (typeof rawId === "number" && Number.isFinite(rawId)) numericId = rawId;
  else if (typeof rawId === "string" && rawId.trim() !== "") numericId = Number(rawId);
  const originalTitle = normalizeMovieOriginalTitle(
    typeof m.original_title === "string" ? m.original_title : "",
  );
  const slugStr = typeof m.slug === "string" ? m.slug : undefined;

  let genreLine =
    typeof gf.genre === "string" && gf.genre.trim()
      ? gf.genre.trim()
      : movieGenreSlugsToDisplayLine(gf.genreSlugs);
  let genreSlugs = gf.genreSlugs;
  let genreSlug = gf.genreSlug;
  if (!genreLine && Number.isFinite(numericId)) {
    const fromLink = genresFromLinkIndex(numericId, slugStr, linkIndex);
    genreLine = fromLink.genre;
    genreSlugs = fromLink.genreSlugs;
    genreSlug = fromLink.genreSlug;
  }

  return {
    id: Number.isFinite(numericId) ? numericId : 0,
    documentId: m.documentId,
    slug: m.slug,
    title: m.title,
    originalTitle,
    director: m.director,
    cast: normalizeCastFromStrapi(m.cast),
    genre: genreLine,
    genreSlug,
    genreSlugs,
    duration: m.duration,
    language: m.language,
    isDubbed: movieIsDubbedFromRaw(m as Record<string, unknown>),
    ageRating: m.age_rating,
    synopsis: m.synopsis,
    criticScore: m.critic_score,
    imdbRating: parseOptionalDecimal(m.imdb_rating) ?? parseOptionalDecimal(m.critic_score),
    mostTalkedAbout: m.most_talked_about === true,
    releaseDate: m.release_date,
    trailerUrl: m.trailer_url,
    ...(() => {
      const variants = strapiPosterSrcSet(m.poster);
      const src = strapiMediaUrl(m.poster, posterPrefer) ?? variants?.src;
      return {
        posterUrl: src ?? null,
        posterSrcSet: variants?.srcSet,
      };
    })(),
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
    posterUrl: strapiMediaUrl(s.poster, "medium") ?? undefined,
    gradientFrom: s.gradient_from || "#2c3e50",
    gradientTo: s.gradient_to || "#8e44ad",
    isPremiere: s.is_premiere,
    isLastShows: s.is_last_shows,
    onTour: s.on_tour === true,
    moreLink: typeof s.more_link === "string" ? s.more_link.trim() : "",
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
    posterUrl: strapiMediaUrl(r.poster, "medium") ?? undefined,
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

function mapShowtime(
  rawS: any,
  hydrate?: {
    byId: Map<number, StrapiMovieGenre>;
    byDoc: Map<string, StrapiMovieGenre>;
    bySlug: Map<string, StrapiMovieGenre>;
  },
  linkIndex?: MovieGenreLinkIndex,
): StrapiShowtime[] {
  const s = unwrapStrapiEntry(rawS);
  const ss = s.summer_screening;
  const summerScreening = ss === true || ss === "true" || ss === 1;
  const venueId = strapiRelationNumericId(s.venue as unknown);
  const vAttrs = strapiRelationAttrs(s.venue as unknown);
  const venueSlug =
    typeof vAttrs?.slug === "string" && vAttrs.slug.trim()
      ? vAttrs.slug.trim()
      : undefined;
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
  const movieOriginalTitle =
    typeof mAttrs?.original_title === "string"
      ? normalizeMovieOriginalTitle(mAttrs.original_title)
      : typeof (s.movie as { original_title?: unknown } | undefined)?.original_title === "string"
        ? normalizeMovieOriginalTitle(String((s.movie as { original_title: string }).original_title))
        : undefined;
  const movieId = strapiRelationNumericId(s.movie as unknown);

  const gfShow = movieGenresFromMovieRaw((mAttrs ?? {}) as Record<string, unknown>, hydrate);
  let movieGenreFromShowtime =
    typeof gfShow.genre === "string" && gfShow.genre.trim()
      ? gfShow.genre.trim()
      : movieGenreSlugsToDisplayLine(gfShow.genreSlugs);
  let movieGenreSlugsFromShowtime = gfShow.genreSlugs;
  if (!movieGenreFromShowtime && movieId != null && linkIndex) {
    const fromLink = genresFromLinkIndex(movieId, movieSlug, linkIndex);
    movieGenreFromShowtime = fromLink.genre;
    movieGenreSlugsFromShowtime = fromLink.genreSlugs;
  }

  const posterVariants = mAttrs ? strapiPosterSrcSet(mAttrs.poster) : undefined;
  const moviePosterUrl = mAttrs ? strapiMediaUrl(mAttrs.poster, "small") ?? posterVariants?.src ?? null : undefined;
  const moviePosterSrcSet = posterVariants?.srcSet;

  const baseId = String(s.id);
  const slots = Array.isArray(s.show_slots) ? s.show_slots : [];

  const seatsRaw = s.available_seats;
  const seatsNum =
    seatsRaw !== null && seatsRaw !== undefined && seatsRaw !== ""
      ? typeof seatsRaw === "number"
        ? seatsRaw
        : Number(seatsRaw)
      : NaN;

  const scheduleKindRaw = s.schedule_kind;
  const scheduleKind =
    scheduleKindRaw === "week_block" ? ("week_block" as const) : ("exact" as const);
  const weekEnd =
    typeof s.week_end === "string" && s.week_end.trim()
      ? s.week_end.trim().slice(0, 10)
      : undefined;

  const venueDayPrices = mapVenueDayPrices(vAttrs?.day_prices);
  const legacyShowtimePrice = parseShowtimePrice(s.price);

  const toRow = (datetime: string, index: number) => {
    const pricing = resolveShowtimePricing(datetime, venueDayPrices, legacyShowtimePrice);
    return {
    id: `${baseId}-${index}`,
    documentId: s.documentId,
    datetime,
    scheduleKind,
    weekEnd,
    venue,
    venueId,
    venueSlug,
    hallId,
    hallName,
    summerScreening,
    venueSummerOutdoor,
    availableSeats: Number.isFinite(seatsNum) ? seatsNum : 0,
    price: pricing.regular,
    priceStudent: pricing.student,
    movieId,
    movieSlug,
    movieTitle,
    movieOriginalTitle,
    movieGenre: movieGenreFromShowtime || undefined,
    movieGenreSlugs: movieGenreSlugsFromShowtime.length ? movieGenreSlugsFromShowtime : undefined,
    moviePosterUrl,
    moviePosterSrcSet,
  };
  };

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
    /** Υποπεριοχή (enumeration Strapi) — κυρίως για φίλτρο Αθήνας. */
    district: typeof v.district === "string" && v.district ? v.district : undefined,
    googleMapsUrl: v.google_maps_url,
    moreLink: typeof v.more_link === "string" ? v.more_link.trim() : "",
    seatsTotal: v.seats_total,
    type: normalizeVenueKind(v.type) ?? "cinema",
    summerOutdoor,
    dayPrices: mapVenueDayPrices(v.day_prices),
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
  /** Ελληνικός τίτλος — κύρια γραμμή εμφάνισης (δεν είναι μοναδικό κλειδί). */
  title: string;
  /** Πρωτότυπος / διεθνής τίτλος — μοναδικό business key (εκτός id). Το slug προκύπτει από αυτό. */
  originalTitle: string;
  director: string;
  cast: string[];
  /** Οι ετικέτες ενωμένες με « · » για λίστες και κείμενο. */
  genre: string;
  /** slug πρώτου είδους (συμβατότητα) */
  genreSlug?: string;
  /** Όλα τα slug ειδών από το CMS — φίλτρα / διακριτά chips. */
  genreSlugs: string[];
  duration: number;
  language: string;
  /** CMS `is_dubbed` ή λέξη-κλειδί στο πεδίο γλώσσα. */
  isDubbed: boolean;
  ageRating: string;
  synopsis: string;
  criticScore: number;
  imdbRating?: number;
  /** CMS `most_talked_about` — pool για hero αρχικής. */
  mostTalkedAbout: boolean;
  releaseDate: string;
  trailerUrl?: string;
  posterUrl?: string;
  posterSrcSet?: string;
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
  /** Περιοδεία — τμήμα tours στην αρχική. */
  onTour: boolean;
  /** URL περιοδείας / κρατήσεων / site παράστασης. */
  moreLink: string;
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
  /** Π.χ. center, north — από enumeration venue (κυρίως Αθήνα). */
  district?: string;
  googleMapsUrl: string;
  /** ιστότοπος / κρατήσεις — εμφανίζεται ως «Περισσότερα» */
  moreLink: string;
  seatsTotal: number;
  type: VenueKind;
  summerOutdoor: boolean;
  /** Τιμές ανά ημέρα εβδομάδας (από CMS). */
  dayPrices?: VenueDayPrice[];
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
  /** CMS `schedule_kind`: `week_block` = ολόκληρη εβδομάδα χωρίς ώρες. */
  scheduleKind?: "exact" | "week_block";
  /** Τέλος εβδομάδας (YYYY-MM-DD) όταν scheduleKind = week_block. */
  weekEnd?: string;
  venue: string;
  /** όταν η σχέση venue υπάρχει αλλά δεν ήρθαν attributes στο REST */
  venueId?: number;
  /** Slug χώρου από populate venue — για σύνδεσμο «Πρόγραμμα» χωρίς πλήρη λίστα venues */
  venueSlug?: string;
  /** CMS `summer_screening`: εξωτερική προβολή → ετικέτα «Θερινό» & φίλτρα θερινών */
  summerScreening: boolean;
  /** Πληροφοριακό από venue (δεν εμφανίζεται αυτόματα ως «Θερινό» στην προβολή) */
  venueSummerOutdoor: boolean;
  availableSeats: number;
  price?: number;
  priceStudent?: number;
  movieId?: number;
  movieSlug?: string;
  movieTitle?: string;
  /** Μοναδικό κλειδί ταινίας — από populate movie.original_title. */
  movieOriginalTitle?: string;
  /** Από `populate[movie]=*`: είδη όταν η γραμμή `/movies` δεν φέρνει σχέση ή χρησιμοποιούμε stub ταινίας. */
  movieGenre?: string;
  movieGenreSlugs?: string[];
  /** Από populate poster στη σχέση movie — λίστες χωρίς πλήρες catalog. */
  moviePosterUrl?: string | null;
  moviePosterSrcSet?: string;
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

async function fetchMovieGenreEntities(): Promise<StrapiMovieGenre[]> {
  const catalog = await fetchMovieGenreCatalog();
  return catalog.genres;
}

/**
 * Strapi 4: χωρίς `populate` το REST δεν συμπεριλαμβάνει σχέσεις στο `attributes` (ούτε κενά `movie_genres`).
 * Το `populate=*` γεμίζει όλες τις σχέσεις 1ου επιπέδου (poster, movie_genres, cast κ.λπ.).
 * Για χειροκίνητο έλεγχο: `/api/movies?populate=*` (ή `?populate[movie_genres]=*` μόνο για τα είδη).
 */
const MOVIE_PUBLIC_POPULATE: Record<string, string> = {
  "populate[movie_genres]": "*",
  "populate[poster]": "*",
  "populate[cast]": "*",
};

/** Αρχική / λίστες — χωρίς cast (μικρότερο bootstrap & TBT). */
const MOVIE_HOME_LIST_POPULATE: Record<string, string> = {
  "populate[movie_genres]": "*",
  "populate[poster]": "*",
};

const THEATER_SHOW_PUBLIC_QUERY: Record<string, string> = {
  "fields[0]": "slug",
  "fields[1]": "title",
  "fields[2]": "synopsis",
  "fields[3]": "director",
  "fields[4]": "genre",
  "fields[5]": "duration",
  "fields[6]": "gradient_from",
  "fields[7]": "gradient_to",
  "fields[8]": "is_premiere",
  "fields[9]": "is_last_shows",
  "fields[10]": "on_tour",
  "fields[11]": "more_link",
  "populate[cast]": "*",
  "populate[venue][fields][0]": "name",
  "populate[poster][fields][0]": "url",
  "populate[poster][fields][1]": "formats",
};

const RESTAURANT_PUBLIC_QUERY: Record<string, string> = {
  "populate[poster][fields][0]": "url",
  "populate[poster][fields][1]": "formats",
};

const VENUE_PUBLIC_QUERY: Record<string, string> = {
  "fields[0]": "slug",
  "fields[1]": "name",
  "fields[2]": "address",
  "fields[3]": "city",
  "fields[4]": "district",
  "fields[5]": "google_maps_url",
  "fields[6]": "more_link",
  "fields[7]": "seats_total",
  "fields[8]": "type",
  "fields[9]": "summer_outdoor",
  "populate[day_prices][fields][0]": "day",
  "populate[day_prices][fields][1]": "regular_price",
  "populate[day_prices][fields][2]": "student_price",
};

const EDITORIAL_REVIEW_PUBLIC_QUERY: Record<string, string> = {
  "populate[movie][fields][0]": "title",
  "populate[theater_show][fields][0]": "title",
  "populate[restaurant][fields][0]": "name",
};

const SHOWTIME_POPULATE: Record<string, string> = {
  "populate[movie][fields][0]": "title",
  "populate[movie][fields][1]": "slug",
  "populate[movie][fields][2]": "original_title",
  "populate[movie][populate][poster]": "*",
  "populate[movie][populate][movie_genres][fields][0]": "slug",
  "populate[movie][populate][movie_genres][fields][1]": "label",
  "populate[movie][populate][movie_genres][fields][2]": "sort_order",
  "populate[venue][populate][day_prices]": "*",
  "populate[venue][fields][0]": "name",
  "populate[venue][fields][1]": "slug",
  "populate[venue][fields][2]": "summer_outdoor",
  "populate[hall][fields][0]": "name",
};

function upcomingShowtimeFilters(now = new Date()): Record<string, string> {
  const nowIso = now.toISOString();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return {
    "filters[$or][0][datetime][$gte]": nowIso,
    "filters[$or][1][schedule_kind][$eq]": "week_block",
    "filters[$or][1][week_end][$gte]": todayKey,
    "sort[0]": "datetime:asc",
  };
}

async function fetchSiteNavigation(): Promise<MappedSiteNavigation | null> {
  const url = new URL(`${API_PREFIX}/site-navigation`, apiRequestBaseUrl());
  url.searchParams.set("populate[items]", "*");
  const res = await fetch(url.toString());
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as unknown;
  const root = json as { data?: { attributes?: Record<string, unknown> } };
  const attrs = root?.data?.attributes;
  if (!attrs) return null;
  return resolveSiteNavigation(attrs);
}

async function fetchHomepage(): Promise<MappedHomepage | null> {
  const url = new URL(`${API_PREFIX}/homepage`, apiRequestBaseUrl());
  url.searchParams.set("populate[layout_sections]", "*");
  const res = await fetch(url.toString());
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as unknown;
  const root = json as { data?: { attributes?: Record<string, unknown> } };
  const attrs = root?.data?.attributes;
  if (!attrs) return null;
  return mapHomeAttributes(attrs);
}

export type { MappedSiteNavigation, NavLinkItem, NavIconKey } from "@/config/navigation";

export const api = {
  getSiteNavigation: () => fetchSiteNavigation().then((n) => n ?? DEFAULT_SITE_NAVIGATION),

  getHomepage: () => fetchHomepage(),

  getMovieGenreCatalog: () => fetchMovieGenreCatalog(),

  getMovies: () =>
    Promise.all([
      fetchMovieGenreCatalog(),
      fetchAPIPagedEntries("/movies", { ...MOVIE_PUBLIC_POPULATE }),
    ]).then(([catalog, rows]) => rows.map((x) => mapMovie(x, catalog.hydrate, catalog.linkIndex))),

  /** Ελαφρύτερο payload για αρχική όταν δεν χρειάζονται new/soon/week sections. */
  getMoviesForHome: () =>
    Promise.all([
      fetchMovieGenreCatalog(),
      fetchAPIPagedEntries("/movies", { ...MOVIE_HOME_LIST_POPULATE }),
    ]).then(([catalog, rows]) => rows.map((x) => mapMovie(x, catalog.hydrate, catalog.linkIndex))),

  getMovieBySlug: (slug: string) =>
    Promise.all([
      fetchMovieGenreCatalog(),
      fetchAPI<any[]>(`/movies`, {
        "filters[slug][$eq]": slug,
        ...MOVIE_PUBLIC_POPULATE,
      }),
    ]).then(([catalog, d]) => {
      const row = strapiCollectionFirst(d);
      return row ? mapMovie(row, catalog.hydrate, catalog.linkIndex, "large") : undefined;
    }),

  getMovieByOriginalTitle: (originalTitle: string) =>
    Promise.all([
      fetchMovieGenreCatalog(),
      fetchAPI<any[]>(`/movies`, {
        "filters[original_title][$eq]": normalizeMovieOriginalTitle(originalTitle),
        ...MOVIE_PUBLIC_POPULATE,
      }),
    ]).then(([catalog, d]) => {
      const row = strapiCollectionFirst(d);
      return row ? mapMovie(row, catalog.hydrate, catalog.linkIndex, "large") : undefined;
    }),

  getMovieGenres: () => fetchMovieGenreEntities(),

  getTheaterShows: () =>
    fetchAPI<any[]>("/theater-shows", THEATER_SHOW_PUBLIC_QUERY).then((d) =>
      (Array.isArray(d) ? d : []).map((x) => mapTheaterShow(x)),
    ),
  getTheaterShowBySlug: (slug: string) =>
    fetchAPI<any[]>(`/theater-shows`, { ...THEATER_SHOW_PUBLIC_QUERY, "filters[slug][$eq]": slug }).then((d) => {
      const row = strapiCollectionFirst(d);
      return row ? mapTheaterShow(row) : undefined;
    }),

  getRestaurants: () =>
    fetchAPI<any[]>("/restaurants", RESTAURANT_PUBLIC_QUERY).then((d) => (Array.isArray(d) ? d : []).map((x) => mapRestaurant(x))),
  getRestaurantBySlug: (slug: string) =>
    fetchAPI<any[]>(`/restaurants`, { ...RESTAURANT_PUBLIC_QUERY, "filters[slug][$eq]": slug }).then((d) => {
      const row = Array.isArray(d) ? d[0] : undefined;
      return row ? mapRestaurant(row) : undefined;
    }),

  getVenues: () =>
    fetchAPIPagedEntries("/venues", VENUE_PUBLIC_QUERY).then((rows) => rows.map((x) => mapVenue(x))),

  getEditorialReviews: () =>
    fetchAPI<any[]>("/editorial-reviews", EDITORIAL_REVIEW_PUBLIC_QUERY).then((d) =>
      (Array.isArray(d) ? d : []).map((x) => mapEditorialReview(x)),
    ),
  getEditorialReviewBySlug: (slug: string) =>
    fetchAPI<any[]>(`/editorial-reviews`, { ...EDITORIAL_REVIEW_PUBLIC_QUERY, "filters[slug][$eq]": slug }).then((d) => {
      const row = Array.isArray(d) ? d[0] : undefined;
      return row ? mapEditorialReview(row) : undefined;
    }),

  getShowtimes: (options?: { venueSlug?: string }) => {
    const venueSlug = typeof options?.venueSlug === "string" ? options.venueSlug.trim() : "";
    if (venueSlug) {
      const venueFilter = { "filters[venue][slug][$eq]": venueSlug };
      return fetchAPI<any[]>(
        "/showtimes/venue-calendar",
        { venue: venueSlug, weeks: "3" },
        { noStore: true },
      )
        .then((rows) => (Array.isArray(rows) ? rows : []).flatMap((x) => mapShowtime(x)))
        .catch(async () => {
          // Fallback: αν αποτύχει το lightweight endpoint, χρησιμοποιούμε το κλασικό query.
          const [catalog, rows] = await Promise.all([
            fetchMovieGenreCatalog(),
            fetchAPIPagedEntries(
              "/showtimes",
              {
                ...SHOWTIME_POPULATE,
                ...upcomingShowtimeFilters(),
                ...venueFilter,
              },
              { noStore: true },
            ),
          ]);
          return rows.flatMap((x) => mapShowtime(x, catalog.hydrate, catalog.linkIndex));
        });
    }
    return Promise.all([
      fetchMovieGenreCatalog(),
      fetchAPIPagedEntries(
        "/showtimes",
        {
          ...SHOWTIME_POPULATE,
          ...upcomingShowtimeFilters(),
        },
        { noStore: true },
      ),
    ]).then(([catalog, rows]) => rows.flatMap((x) => mapShowtime(x, catalog.hydrate, catalog.linkIndex)));
  },

  getUserReviews: () =>
    fetchAPI<any[]>("/user-reviews").then((d) => (Array.isArray(d) ? d : []).map((x) => mapUserReview(x))),
};