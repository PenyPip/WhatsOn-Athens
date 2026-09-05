import type { StrapiTheaterPerformance, StrapiTheaterShow } from "@/lib/api";
import { filterVisibleTheaterShows } from "@/lib/theaterRunDates";
import { theaterShowHasUpcomingPerformances } from "@/lib/theaterPerformances";

export const THEATER_KIDS_PATH = "/theater/kids";

/** Reserved segments κάτω από /theater/ (όχι slug παράστασης). */
export const THEATER_RESERVED_SEGMENTS = new Set(["venue", "kids"]);

/**
 * More.com παιδικό θέατρο: `/tickets/theater/children/…`
 * π.χ. https://www.more.com/gr-el/tickets/theater/children/
 */
export function moreTheaterLinkIsKids(url: string | null | undefined): boolean {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return false;
  try {
    const path = new URL(raw).pathname.toLowerCase();
    return /\/tickets\/theater\/children(?:\/|$)/.test(path);
  } catch {
    return /\/tickets\/theater\/children(?:\/|$|\?)/i.test(raw);
  }
}

export function isTheaterKidsPath(path: string): boolean {
  const normalized = path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  return normalized === THEATER_KIDS_PATH;
}

export function isTheaterReservedSegment(seg: string): boolean {
  return THEATER_RESERVED_SEGMENTS.has(seg.trim().toLowerCase());
}

/** Παιδική παράσταση: CMS `is_kids` ή More link `/theater/children/`. */
export function isKidsTheaterShow(
  show: Pick<StrapiTheaterShow, "isKids" | "moreLink">,
): boolean {
  return show.isKids === true || moreTheaterLinkIsKids(show.moreLink);
}

function performancesByShowSlug(
  performances: readonly StrapiTheaterPerformance[] | undefined,
): Map<string, StrapiTheaterPerformance[]> {
  const m = new Map<string, StrapiTheaterPerformance[]>();
  for (const p of performances ?? []) {
    const slug = p.theaterShowSlug?.trim();
    if (!slug) continue;
    const list = m.get(slug) ?? [];
    list.push(p);
    m.set(slug, list);
  }
  return m;
}

/** Παιδικές αρχικής / /theater/kids: μόνο με επερχόμενη παράσταση. */
export function filterKidsShowsForHome(
  shows: readonly StrapiTheaterShow[],
  performances?: readonly StrapiTheaterPerformance[],
): StrapiTheaterShow[] {
  const bySlug = performancesByShowSlug(performances);
  return filterVisibleTheaterShows(shows)
    .filter(isKidsTheaterShow)
    .filter((s) => theaterShowHasUpcomingPerformances(bySlug.get(s.slug) ?? []))
    .sort((a, b) => a.title.localeCompare(b.title, "el"));
}
