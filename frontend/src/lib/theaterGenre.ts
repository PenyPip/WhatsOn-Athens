/** Ετικέτες για enumeration `genre` στο CMS (theater-show). */
export const THEATER_GENRE_LABELS: Record<string, string> = {
  drama: "Δράμα",
  comedy: "Κωμωδία",
  musical: "Μιούζικαλ",
  dance: "Χορός",
  opera: "Όπερα",
};

export function theaterGenreLabel(genre: string | undefined | null): string {
  const key = typeof genre === "string" ? genre.trim().toLowerCase() : "";
  if (!key) return "";
  return THEATER_GENRE_LABELS[key] ?? genre.trim();
}

export type TheaterGenreFilter = "all" | keyof typeof THEATER_GENRE_LABELS;

export const THEATER_GENRE_FILTER_OPTIONS: { value: TheaterGenreFilter; label: string }[] = [
  { value: "all", label: "Όλα" },
  ...(Object.entries(THEATER_GENRE_LABELS) as [keyof typeof THEATER_GENRE_LABELS, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];
