import type { StrapiMovie } from "@/lib/api";
import { movieDisplayName, movieTitleLines } from "@/lib/movieTitles";
import { truncateDescription } from "@/lib/siteMetadata";

/** Στοιχεία προβολών για πλουσιότερα meta (build-time ή client). */
export type MovieShowtimeSeoHint = {
  venueNames?: string[];
  venueCount?: number;
};

function primaryGenreLabel(genreLine?: string): string {
  const first = genreLine?.trim().split(/\s*·\s*/)[0]?.trim();
  return first ?? "";
}

function uniqueVenueNames(names: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names ?? []) {
    const name = String(raw || "").trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("el");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b, "el"));
}

/** Φυσική φράση «X, Y και άλλα (N σινεμά)» για meta/H1. */
export function formatMovieVenueList(names: string[], maxNamed = 2): string {
  const uniq = uniqueVenueNames(names);
  if (!uniq.length) return "";
  if (uniq.length === 1) return uniq[0];
  if (uniq.length === 2) return `${uniq[0]} και ${uniq[1]}`;
  const head = uniq.slice(0, maxNamed).join(", ");
  return `${head} και άλλα (${uniq.length} σινεμά)`;
}

function shortVenueLead(names: string[]): string {
  const uniq = uniqueVenueNames(names);
  if (!uniq.length) return "";
  if (uniq.length === 1) return uniq[0];
  return `${uniq[0]} & άλλα`;
}

/**
 * Title / description / H1 για `/movies/:slug` — στοχεύει «[όνομα ταινίας]», «πού παίζεται», «πρόγραμμα».
 * Παρόμοια λογική με `cinemaVenueProgramSeo` για χώρους.
 */
export function movieDetailSeo(
  movie: Pick<StrapiMovie, "title" | "originalTitle" | "synopsis" | "director">,
  genreLine?: string,
  hint?: MovieShowtimeSeoHint,
) {
  const tl = movieTitleLines(movie);
  const name = movieDisplayName(tl);
  const genre = primaryGenreLabel(genreLine);
  const venues = uniqueVenueNames(hint?.venueNames);
  const venueCount = hint?.venueCount ?? venues.length;
  const venueList = formatMovieVenueList(venues);
  const venueShort = shortVenueLead(venues);

  const title = venueShort
    ? `${name} — παίζεται ${venueShort} · πρόγραμμα σινεμά`
    : genre
      ? `${name} — πού παίζεται · ${genre} · σινεμά`
      : `${name} — πού παίζεται · πρόγραμμα σινεμά`;

  const h1 = `${name} — πού παίζεται`;

  const subtitle = venueList
    ? `Πρόγραμμα προβολών · ${venueList}`
    : "Πρόγραμμα σινεμά · ώρες προβολών";

  const ogTitle = venueShort
    ? `${name} — παίζεται ${venueShort}`
    : `${name} — πού παίζεται · σινεμά`;

  const ogDescription = venueList
    ? truncateDescription(
        `«${tl.primary}» παίζεται τώρα στο ${venueList}. Δες ώρες προβολών, σινεμά και εισιτήρια.`,
      )
    : truncateDescription(
        `«${tl.primary}» — δες πού παίζεται τώρα στα σινεμά. Πρόγραμμα, ώρες προβολών και αφίσα.`,
      );

  const lead = venueList
    ? `Η ταινία «${tl.primary}» παίζεται τώρα στο ${venueList}.`
    : genre
      ? `Πού παίζεται η ταινία ${genre.toLowerCase()} «${tl.primary}» στα σινεμά.`
      : `Πού και πότε παίζεται «${tl.primary}» στα σινεμά της Αθήνας και της Ελλάδας.`;

  const director = movie.director?.trim();
  const directorBit = director ? ` Σκηνοθεσία: ${director}.` : "";
  const synopsis = (movie.synopsis ?? "").trim();
  const tail = " Πρόγραμμα προβολών, ώρες και αφίσες στο 37Ν.";

  const description = synopsis
    ? truncateDescription(`${lead}${directorBit} ${synopsis}${tail}`)
    : truncateDescription(`${lead}${directorBit}${tail}`);

  const intro = venueList
    ? `Δες πού παίζεται η ταινία «${tl.primary}» τώρα — ${venueList}. Ενημερωμένο πρόγραμμα προβολών, ώρες${venueCount > 0 ? ` σε ${venueCount} σινεμά` : ""} και πληροφορίες για εισιτήρια.`
    : `Δες πού και πότε παίζεται η ταινία «${tl.primary}» στα σινεμά της Αθήνας και της υπόλοιπης Ελλάδας — πρόγραμμα, ώρες προβολών και αφίσα.`;

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    h1,
    subtitle,
    intro,
    venueCount,
  };
}

/** @deprecated Χρησιμοποίησε `movieDetailSeo`. */
export function moviePageTitle(movie: StrapiMovie, genreLine?: string, hint?: MovieShowtimeSeoHint): string {
  return movieDetailSeo(movie, genreLine, hint).title;
}

/** @deprecated Χρησιμοποίησε `movieDetailSeo`. */
export function moviePageDescription(
  movie: StrapiMovie,
  genreLine: string,
  hint?: MovieShowtimeSeoHint,
): string {
  return movieDetailSeo(movie, genreLine, hint).description;
}
