import { formatUpcomingCinemaWeekRange } from "@/lib/homeMovieFilters";
import type { MoviesSectionSegment } from "@/lib/moviesFilterPaths";
import { truncateDescription } from "@/lib/siteMetadata";
import { slugToDisplayName } from "@/lib/jsonLdPage";

const SECTION_SEO: Record<
  MoviesSectionSegment,
  { title: string; description: string; h1: string }
> = {
  today: {
    title: "Ταινίες σήμερα στα σινεμά — Αθήνα & Θεσσαλονίκη",
    h1: "Ταινίες σήμερα",
    description:
      "Δες ποιες ταινίες παίζουν σήμερα στα σινεμά: ώρες προβολών, σινεμά και αφίσες στην Αθήνα, τη Θεσσαλονίκη και όλη την Ελλάδα.",
  },
  week: {
    title: "Ταινίες εβδομάδας κινηματογράφου — πρόγραμμα",
    h1: "Εβδομάδα κινηματογράφου",
    description: `Ταινίες και προβολές για την ερχόμενη εβδομάδα κινηματογράφου (${formatUpcomingCinemaWeekRange()}).`,
  },
  summer: {
    title: "Θερινά σινεμά & θερινές προβολές",
    h1: "Θερινές προβολές",
    description: "Θερινά σινεμά και εξωτερικές προβολές — πρόγραμμα και ώρες για την τρέχουσα εβδομάδα.",
  },
  new: {
    title: "Νέες ταινίες στα σινεμά — τελευταίες κυκλοφορίες",
    h1: "Νέες ταινίες",
    description: "Ταινίες που κυκλοφόρησαν πρόσφατα στα σινεμά — πρόγραμμα προβολών ανά πόλη και σινεμά.",
  },
  soon: {
    title: "Ταινίες προσεχώς — μετά την εβδομάδα κινηματογράφου",
    h1: "Προσεχώς",
    description: "Ταινίες που έρχονται μετά την τρέχουσα εβδομάδα κινηματογράφου — ημερομηνίες και πληροφορίες.",
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
