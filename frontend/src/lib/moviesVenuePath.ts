/** Canonical path προγράμματος σινεμά (indexable, στο sitemap). */
export function moviesVenueProgramPath(slug: string): string {
  const s = slug.trim();
  return s ? `/movies/venue/${encodeURIComponent(s)}` : "/movies";
}

export function parseMoviesVenueProgramPath(path: string): string | null {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const m = normalized.match(/^\/movies\/venue\/([^/]+)$/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]).trim() || null;
  } catch {
    return m[1].trim() || null;
  }
}

export function isMoviesVenueProgramPath(path: string): boolean {
  return parseMoviesVenueProgramPath(path) !== null;
}
