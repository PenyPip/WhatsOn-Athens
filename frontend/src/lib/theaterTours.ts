import type { StrapiTheaterShow } from "@/lib/api";
import { filterVisibleTheaterShows } from "@/lib/theaterRunDates";

/** Παράσταση σε περιοδεία (CMS `on_tour`). */
export function isTouringTheaterShow(show: Pick<StrapiTheaterShow, "onTour">): boolean {
  return show.onTour === true;
}

export function filterTouringShowsForHome(shows: readonly StrapiTheaterShow[]): StrapiTheaterShow[] {
  return filterVisibleTheaterShows(shows)
    .filter(isTouringTheaterShow)
    .sort((a, b) => a.title.localeCompare(b.title, "el"));
}

export function filterResidentTheaterShows(shows: readonly StrapiTheaterShow[]): StrapiTheaterShow[] {
  return filterVisibleTheaterShows(shows)
    .filter((s) => !s.onTour)
    .sort((a, b) => a.title.localeCompare(b.title, "el"));
}
