/** Canonical path προγράμματος θεατρικού χώρου. */
export function theaterVenueProgramPath(slug: string): string {
  const s = slug.trim();
  return s ? `/theater/venue/${encodeURIComponent(s)}` : "/theater";
}

export function parseTheaterVenueProgramPath(path: string): string | null {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const m = normalized.match(/^\/theater\/venue\/([^/]+)$/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]).trim() || null;
  } catch {
    return m[1].trim() || null;
  }
}

export function isTheaterVenueProgramPath(path: string): boolean {
  return parseTheaterVenueProgramPath(path) !== null;
}
