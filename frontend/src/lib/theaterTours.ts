import type { StrapiTheaterPerformance, StrapiTheaterShow } from "@/lib/api";
import { filterVisibleTheaterShows } from "@/lib/theaterRunDates";
import { theaterShowHasUpcomingPerformances } from "@/lib/theaterPerformances";

/** Παράσταση σε περιοδεία (CMS `on_tour`). */
export function isTouringTheaterShow(show: Pick<StrapiTheaterShow, "onTour">): boolean {
  return show.onTour === true;
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

/** Περιοδείες αρχικής: μόνο με τουλάχιστον μία επερχόμενη παράσταση. */
export function filterTouringShowsForHome(
  shows: readonly StrapiTheaterShow[],
  performances?: readonly StrapiTheaterPerformance[],
): StrapiTheaterShow[] {
  const bySlug = performancesByShowSlug(performances);
  return filterVisibleTheaterShows(shows)
    .filter(isTouringTheaterShow)
    .filter((s) => theaterShowHasUpcomingPerformances(bySlug.get(s.slug) ?? []))
    .sort((a, b) => a.title.localeCompare(b.title, "el"));
}

export function filterResidentTheaterShows(
  shows: readonly StrapiTheaterShow[],
  performances?: readonly StrapiTheaterPerformance[],
): StrapiTheaterShow[] {
  const bySlug = performancesByShowSlug(performances);
  return filterVisibleTheaterShows(shows)
    .filter((s) => !s.onTour)
    .filter((s) => theaterShowHasUpcomingPerformances(bySlug.get(s.slug) ?? []))
    .sort((a, b) => a.title.localeCompare(b.title, "el"));
}
