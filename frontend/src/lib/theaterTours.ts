import type { StrapiTheaterShow } from "@/lib/api";

/** Παράσταση σε περιοδεία (CMS `on_tour`). */
export function isTouringTheaterShow(show: Pick<StrapiTheaterShow, "onTour">): boolean {
  return show.onTour === true;
}

export function filterTouringShowsForHome(shows: readonly StrapiTheaterShow[]): StrapiTheaterShow[] {
  return shows.filter(isTouringTheaterShow).sort((a, b) => a.title.localeCompare(b.title, "el"));
}

export function filterResidentTheaterShows(shows: readonly StrapiTheaterShow[]): StrapiTheaterShow[] {
  return shows.filter((s) => !s.onTour).sort((a, b) => a.title.localeCompare(b.title, "el"));
}
