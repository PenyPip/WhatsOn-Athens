import { truncateDescription } from "@/lib/siteMetadata";
import type { StrapiMovie, StrapiTheaterShow } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";

/** Στατικοί τίτλοι/περιγραφές για λίστες και στατικές σελίδες. */
export const staticPageSeo = {
  home: {
    title: "Αρχική",
    description:
      "Ταινίες στα σινεμά, θεατρικές παραστάσεις και ώρες προβολής — Αθήνα, Θεσσαλονίκη και όλη η Ελλάδα.",
    path: "/",
  },
  movies: {
    title: "Ταινίες",
    description: "Όλες οι ταινίες που παίζουν τώρα στα σινεμά — φίλτρα ανά πόλη, σινεμά και είδος.",
    path: "/movies",
  },
  theater: {
    title: "Θέατρο",
    description: "Θεατρικές παραστάσεις, χώροι και πληροφορίες για την τρέχουσα περίοδο.",
    path: "/theater",
  },
  venues: {
    title: "Χώροι",
    description: "Σινεμά και θέατρα — διευθύνσεις και ταινίες/παραστάσεις ανά χώρο.",
    path: "/venues",
  },
  dining: {
    title: "Φαγητό",
    description: "Εστιατόρια και προτάσεις φαγητού κοντά στην έξοδό σου.",
    path: "/dining",
  },
  reviews: {
    title: "Κριτικές",
    description: "Κριτικές συντακτών και χρηστών για ταινίες και παραστάσεις.",
    path: "/reviews",
  },
  privacy: {
    title: "Απόρρητο & cookies",
    description: "Πολιτική απορρήτου, cookies και διαφημίσεων του 37Ν.",
    path: "/privacy",
  },
  profile: {
    title: "Προφίλ",
    description: "Λογαριασμός χρήστη στο 37Ν.",
    path: "/profile",
    noIndex: true,
  },
  notFound: {
    title: "Η σελίδα δεν βρέθηκε",
    description: "Ο σύνδεσμος δεν αντιστοιχεί σε σελίδα του 37Ν.",
    noIndex: true,
  },
} as const;

export function moviePageDescription(movie: StrapiMovie, genreLine: string): string {
  const tl = movieTitleLines(movie);
  const titlePart = tl.secondary ? `${tl.primary} (${tl.secondary})` : tl.primary;
  const bits: string[] = [];
  if (genreLine) bits.push(genreLine);
  if (movie.director?.trim()) bits.push(`σκηνοθεσία ${movie.director.trim()}`);
  const synopsis = (movie.synopsis ?? "").trim();
  if (synopsis) {
    return truncateDescription(
      bits.length
        ? `${titlePart} — ${bits.join(" · ")}. ${synopsis}`
        : `${titlePart}. ${synopsis}`,
    );
  }
  return truncateDescription(
    bits.length
      ? `Προβολές και ώρες για ${titlePart}. ${bits.join(" · ")}.`
      : `Προβολές και ώρες για ${titlePart} σε σινεμά σε όλη την Ελλάδα.`,
  );
}

export function theaterPageDescription(show: StrapiTheaterShow): string {
  const bits: string[] = [];
  if (show.genre?.trim()) bits.push(show.genre.trim());
  if (show.venue?.trim()) bits.push(show.venue.trim());
  const synopsis = (show.synopsis ?? "").trim();
  if (synopsis) {
    return truncateDescription(
      bits.length ? `${show.title} — ${bits.join(" · ")}. ${synopsis}` : `${show.title}. ${synopsis}`,
    );
  }
  return truncateDescription(
    bits.length
      ? `${show.title} — ${bits.join(" · ")}. Πληροφορίες και κριτικές.`
      : `${show.title}. Πληροφορίες θεατρικής παράστασης.`,
  );
}
