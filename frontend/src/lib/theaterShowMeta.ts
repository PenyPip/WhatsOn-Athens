import type { StrapiTheaterShow } from "@/lib/api";

type TheaterAgeFields = Pick<StrapiTheaterShow, "ageFrom" | "ageTo" | "ageRange">;
type TheaterCreditFields = Pick<StrapiTheaterShow, "author" | "director">;

/** Εμφάνιση εύρους ηλικίας: ελεύθερο κείμενο ή «4–10 ετών» / «από 5 ετών». */
export function formatTheaterAgeRange(show: TheaterAgeFields): string | null {
  const free = (show.ageRange ?? "").trim();
  if (free) return free;

  const from =
    typeof show.ageFrom === "number" && Number.isFinite(show.ageFrom) ? Math.round(show.ageFrom) : null;
  const to = typeof show.ageTo === "number" && Number.isFinite(show.ageTo) ? Math.round(show.ageTo) : null;
  if (from != null && to != null) {
    if (from === to) return `${from} ετών`;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    return `${lo}–${hi} ετών`;
  }
  if (from != null) return `από ${from} ετών`;
  if (to != null) return `έως ${to} ετών`;
  return null;
}

/** Υπότιτλος κάρτας: συγγραφέας · σκηνοθέτης. */
export function theaterCardSubtitle(show: TheaterCreditFields): string {
  const author = (show.author ?? "").trim();
  const director = (show.director ?? "").trim();
  if (author && director && author !== director) return `${author} · ${director}`;
  return author || director || "";
}
