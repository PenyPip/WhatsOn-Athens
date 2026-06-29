import { formatUpcomingCinemaWeekRange } from "@/lib/homeMovieFilters";
import type { MoviesSectionSegment } from "@/lib/moviesFilterPaths";
import { truncateDescription } from "@/lib/siteMetadata";
import { slugToDisplayName } from "@/lib/jsonLdPage";

export type MoviesSectionSeo = {
  title: string;
  description: string;
  h1: string;
  subtitle?: string;
  intro?: string;
  ogTitle?: string;
  ogDescription?: string;
};

const SECTION_SEO: Record<MoviesSectionSegment, MoviesSectionSeo> = {
  today: {
    title: "Ταινίες σήμερα στα σινεμά — πρόγραμμα & ώρες",
    h1: "Ταινίες σήμερα στα σινεμά",
    subtitle: "Ποιες ταινίες παίζουν σήμερα · ώρες προβολών ανά σινεμά",
    description:
      "Ποιες ταινίες παίζουν σήμερα στα σινεμά; Δες ενημερωμένο πρόγραμμα, ώρες προβολών, αφίσες και σινεμά στην Αθήνα, τη Θεσσαλονίκη και όλη την Ελλάδα.",
    ogTitle: "Ταινίες σήμερα — πρόγραμμα σινεμά",
    ogDescription:
      "Ταινίες που παίζουν σήμερα: ώρες προβολών, σινεμά και αφίσες — Αθήνα, Θεσσαλονίκη, Ελλάδα.",
    intro:
      "Εδώ βρίσκεις ποιες ταινίες παίζουν σήμερα στα σινεμά — με ώρες προβολών, αφίσες και φίλτρο ανά πόλη ή σινεμά. Ενημερώνουμε το πρόγραμμα καθημερινά.",
  },
  week: {
    title: "Ταινίες εβδομάδας κινηματογράφου — πρόγραμμα",
    h1: "Εβδομάδα κινηματογράφου",
    subtitle: `Προβολές ${formatUpcomingCinemaWeekRange()} · νέα εβδομάδα κινηματογράφου`,
    description: `Ταινίες και προβολές για την ερχόμενη εβδομάδα κινηματογράφου (${formatUpcomingCinemaWeekRange()}).`,
    intro:
      "Οι ταινίες που ξεκινούν την επόμενη εβδομάδα κινηματογράφου (Πέμπτη–Τετάρτη) — δες αφίσες, σινεμά και ώρες προβολών σε όλη την Αθήνα.",
  },
  summer: {
    title: "Θερινά σινεμά & θερινές προβολές — πρόγραμμα",
    h1: "Θερινές προβολές στα σινεμά",
    subtitle: "Θερινά σινεμά & εξωτερικές προβολές · ώρες & χώροι",
    description:
      "Θερινά σινεμά και εξωτερικές προβολές στην Αθήνα και όλη την Ελλάδα — πρόγραμμα, ώρες και σινεμά για την τρέχουσα σεζόν.",
    intro:
      "Όλα τα θερινά σινεμά και οι εξωτερικές προβολές σε μία λίστα — δες τι παίζεται τώρα, ώρες και τοποθεσία κάθε χώρου.",
  },
  new: {
    title: "Νέες ταινίες στα σινεμά — τελευταίες κυκλοφορίες",
    h1: "Νέες ταινίες",
    description: "Ταινίες που κυκλοφόρησαν πρόσφατα στα σινεμά — πρόγραμμα προβολών ανά πόλη και σινεμά.",
    intro:
      "Ταινίες που κυκλοφόρησαν τις τελευταίες ημέρες στα σινεμά — δες πού παίζονται, ώρες προβολών και αφίσες.",
  },
  soon: {
    title: "Ταινίες προσεχώς — μετά την εβδομάδα κινηματογράφου",
    h1: "Προσεχώς",
    description: "Ταινίες που έρχονται μετά την τρέχουσα εβδομάδα κινηματογράφου — ημερομηνίες και πληροφορίες.",
    intro:
      "Ταινίες με προγραμματισμένη κυκλοφορία μετά την τρέχουσα εβδομάδα κινηματογράφου — δες τι έρχεται σύντομα στα σινεμά.",
  },
};

const AREA_SEO: Record<
  "athens" | "thessaloniki" | "other",
  { title: string; description: string; h1: string }
> = {
  athens: {
    title: "Ταινίες Αθήνα — πρόγραμμα σινεμά",
    h1: "Ταινίες στην Αθήνα",
    description: "Πρόγραμμα ταινιών και ώρες προβολών σε σινεμά της Αθήνας και της Αττικής.",
  },
  thessaloniki: {
    title: "Ταινίες Θεσσαλονίκη — πρόγραμμα σινεμά",
    h1: "Ταινίες στη Θεσσαλονίκη",
    description: "Ταινίες που παίζουν στη Θεσσαλονίκη — σινεμά, ώρες και αφίσες.",
  },
  other: {
    title: "Ταινίες — υπόλοιπη Ελλάδα",
    h1: "Ταινίες στην υπόλοιπη Ελλάδα",
    description: "Πρόγραμμα ταινιών σε σινεμά εκτός Αθήνας και Θεσσαλονίκης.",
  },
};

export function moviesSectionSeo(section: MoviesSectionSegment) {
  return SECTION_SEO[section];
}

export function moviesAreaSeo(area: keyof typeof AREA_SEO) {
  return AREA_SEO[area];
}

export function moviesGenreSeo(slug: string, label?: string) {
  const name = label?.trim() || slugToDisplayName(slug);
  return {
    title: `Ταινίες ${name} — πρόγραμμα σινεμά`,
    h1: `Ταινίες — ${name}`,
    description: truncateDescription(
      `Όλες οι ταινίες είδους ${name} που παίζουν τώρα στα σινεμά — πρόγραμμα, ώρες προβολών και σινεμά.`,
    ),
  };
}
