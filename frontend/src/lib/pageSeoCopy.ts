import { truncateDescription } from "@/lib/siteMetadata";
import type { StrapiMovie, StrapiTheaterShow } from "@/lib/api";
import {
  movieDetailSeo,
  moviePageDescription,
  moviePageTitle,
  type MovieShowtimeSeoHint,
} from "@/lib/movieDetailSeo";

export { movieDetailSeo, moviePageDescription, moviePageTitle, type MovieShowtimeSeoHint };

/** Στατικοί τίτλοι/περιγραφές για λίστες και στατικές σελίδες. */
export const staticPageSeo = {
  home: {
    /** ~50–58 χαρακτήρες με «· 37Ν» (formatPageTitle). */
    title: "Τι παίζεται στα σινεμά — 37Ν · the37n.gr",
    /** Μοναδικό ορατό H1 στην αρχική. */
    h1: "Τι παίζεται σήμερα — ταινίες, κινηματογράφοι & ώρες προβολών",
    description:
      "37Ν (the37n.gr): δες τι παίζεται τώρα και πότε παίζεται κάθε ταινία — πρόγραμμα ανά κινηματογράφο, σινεμά και θερινά στην Αθήνα, Θεσσαλονίκη και όλη την Ελλάδα.",
    path: "/",
  },
  movies: {
    title: "Ταινίες & πρόγραμμα σινεμά — Αθήνα, Θεσσαλονίκη",
    description:
      "Όλες οι ταινίες που παίζουν τώρα στα σινεμά: πρόγραμμα προβολών, φίλτρα ανά πόλη, σινεμά, είδος και θερινά σινεμά σε όλη την Ελλάδα.",
    path: "/movies",
  },
  theater: {
    title: "Θέατρο & παραστάσεις — Αθήνα, Θεσσαλονίκη",
    description:
      "Θεατρικές παραστάσεις και πληροφορίες για την τρέχουσα περίοδο στην Αθήνα, τη Θεσσαλονίκη και την υπόλοιπη Ελλάδα.",
    path: "/theater",
  },
  venues: {
    title: "Χώροι στην Αθήνα — σινεμά, θέατρα & πολιτισμός",
    description:
      "Σινεμά, θέατρα και άλλοι πολιτιστικοί χώροι στην Αθήνα: διευθύνσεις, χάρτης και πρόγραμμα ταινιών ή παραστάσεων ανά χώρο.",
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
  articles: {
    title: "Άρθρα",
    description: "Όλα τα άρθρα, συγκρίσεις και πολιτιστικά κείμενα του 37Ν.",
    path: "/articles",
  },
  events: {
    title: "Events",
    description: "Πολιτιστικές εκδηλώσεις στην Αθήνα — κινηματογράφος, θέατρο, μουσική, τέχνη και περισσότερα.",
    path: "/events",
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

export function theaterPageDescription(show: StrapiTheaterShow): string {
  const bits: string[] = [];
  if (show.genre?.trim()) bits.push(show.genre.trim());
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
