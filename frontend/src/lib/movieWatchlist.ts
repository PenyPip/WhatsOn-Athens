const STORAGE_KEY = "whatson-watchlist-v1";

function readSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  } catch {
    return [];
  }
}

function writeSlugs(slugs: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
}

export function isMovieInWatchlist(slug: string): boolean {
  const want = slug.trim();
  if (!want) return false;
  return readSlugs().includes(want);
}

export function toggleMovieWatchlist(slug: string): boolean {
  const want = slug.trim();
  if (!want) return false;
  const current = readSlugs();
  const has = current.includes(want);
  const next = has ? current.filter((s) => s !== want) : [want, ...current].slice(0, 120);
  writeSlugs(next);
  return !has;
}
