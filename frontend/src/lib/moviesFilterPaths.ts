/** Τμήματα λίστας ταινιών — path segment (όχι query). */
export const MOVIES_SECTION_SEGMENTS = ["today", "week", "summer", "new", "soon"] as const;
export type MoviesSectionSegment = (typeof MOVIES_SECTION_SEGMENTS)[number];

export const MOVIES_AREA_SEGMENTS = ["athens", "thessaloniki", "other"] as const;
export type MoviesAreaSegment = (typeof MOVIES_AREA_SEGMENTS)[number];

/** Segments που δεν είναι slug ταινίας στο `/movies/:slug`. */
export const MOVIES_RESERVED_SEGMENTS = new Set([
  "venue",
  "genre",
  "area",
  ...MOVIES_SECTION_SEGMENTS,
]);

export function isMoviesReservedSegment(seg: string): boolean {
  return MOVIES_RESERVED_SEGMENTS.has(seg.trim().toLowerCase());
}

export function moviesSectionPath(section: MoviesSectionSegment): string {
  return `/movies/${section}`;
}

export function moviesGenrePath(slug: string): string {
  return `/movies/genre/${encodeURIComponent(slug.trim().toLowerCase())}`;
}

export function moviesAreaPath(area: MoviesAreaSegment): string {
  return `/movies/area/${area}`;
}

export type ParsedMoviesFilterPath = {
  section: MoviesSectionSegment | null;
  genreSlug: string | null;
  area: MoviesAreaSegment | null;
};

/** Ανάλυση pathname (χωρίς query) για φίλτρα λίστας ταινιών. */
export function parseMoviesFilterPath(pathname: string): ParsedMoviesFilterPath {
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts[0] !== "movies") {
    return { section: null, genreSlug: null, area: null };
  }
  if (parts.length === 2 && (MOVIES_SECTION_SEGMENTS as readonly string[]).includes(parts[1])) {
    return { section: parts[1] as MoviesSectionSegment, genreSlug: null, area: null };
  }
  if (parts[1] === "genre" && parts[2]) {
    try {
      return { section: null, genreSlug: decodeURIComponent(parts[2]).trim().toLowerCase() || null, area: null };
    } catch {
      return { section: null, genreSlug: parts[2].trim().toLowerCase() || null, area: null };
    }
  }
  if (parts[1] === "area" && parts[2] && (MOVIES_AREA_SEGMENTS as readonly string[]).includes(parts[2])) {
    return { section: null, genreSlug: null, area: parts[2] as MoviesAreaSegment };
  }
  return { section: null, genreSlug: null, area: null };
}

export function isMoviesFilterListPath(pathname: string): boolean {
  const p = parseMoviesFilterPath(pathname);
  return Boolean(p.section || p.genreSlug || p.area);
}
