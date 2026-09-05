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
    title: "the37n.gr - τι παίζεται στα σινεμά & πότε",
    /** Μοναδικό ορατό H1 στην αρχική. */
    h1: "Τι παίζεται σήμερα - ταινίες, κινηματογράφοι & ώρες προβολών",
    description:
      "37Ν (the37n.gr): δες τι παίζεται τώρα και πότε παίζεται κάθε ταινία - πρόγραμμα ανά κινηματογράφο, ώρες προβολών, θερινά σινεμά στην Αθήνα, Θεσσαλονίκη και όλη την Ελλάδα.",
    path: "/",
  },
  movies: {
    title: "Ταινίες & πρόγραμμα σινεμά - Αθήνα, Θεσσαλονίκη",
    description:
      "Όλες οι ταινίες που παίζουν τώρα στα σινεμά: πρόγραμμα προβολών, φίλτρα ανά πόλη, σινεμά, είδος και θερινά σινεμά σε όλη την Ελλάδα.",
    path: "/movies",
  },
  theater: {
    title: "Θέατρο Αθήνα - παραστάσεις & εισιτήρια",
    description:
      "Τι παίζει στο θέατρο τώρα: παραστάσεις, χώροι και ημερομηνίες. Κάνε like στην παράσταση που θες να δεις - μαθαίνεις πρώτος για νέες προβολές.",
    path: "/theater",
  },
  theaterKids: {
    title: "Παιδικές παραστάσεις - θέατρο Αθήνα",
    description:
      "Παιδικές παραστάσεις στο θέατρο: πρόγραμμα, χώροι και ημερομηνίες για όλη την οικογένεια στην Αθήνα και όλη την Ελλάδα.",
    path: "/theater/kids",
  },
  venues: {
    title: "Χώροι στην Αθήνα - σινεμά, θέατρα & πολιτισμός",
    description:
      "Σινεμά, θέατρα και άλλοι πολιτιστικοί χώροι στην Αθήνα: διευθύνσεις, χάρτης και πρόγραμμα ταινιών ή παραστάσεων ανά χώρο.",
    path: "/venues",
  },
  dining: {
    title: "Φαγητό κοντά στην έξοδο - Αθήνα",
    description:
      "Εστιατόρια και προτάσεις φαγητού κοντά σε σινεμά και θέατρα - για πριν ή μετά την προβολή στην Αθήνα.",
    path: "/dining",
  },
  reviews: {
    title: "Κριτικές ταινιών & θεάτρου - 37Ν",
    description:
      "Κριτικές συντακτών και χρηστών για ταινίες και παραστάσεις - βοήθεια να διαλέξεις τι να δεις.",
    path: "/reviews",
  },
  articles: {
    title: "Άρθρα & πολιτισμός - 37Ν Αθήνα",
    description:
      "Άρθρα, συγκρίσεις και πολιτιστικά κείμενα για σινεμά και θέατρο στην Αθήνα - διάβασε πριν βγεις.",
    path: "/articles",
  },
  events: {
    title: "Εκδηλώσεις Αθήνα - σινεμά, θέατρο, τέχνη",
    description:
      "Πολιτιστικές εκδηλώσεις στην Αθήνα: κινηματογράφος, θέατρο, μουσική και τέχνη - ημερομηνίες και χώροι.",
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
      bits.length ? `${show.title} - ${bits.join(" · ")}. ${synopsis}` : `${show.title}. ${synopsis}`,
    );
  }
  return truncateDescription(
    bits.length
      ? `${show.title} - ${bits.join(" · ")}. Πληροφορίες και κριτικές.`
      : `${show.title}. Πληροφορίες θεατρικής παράστασης.`,
  );
}
