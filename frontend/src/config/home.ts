/**
 * Το layout της αρχικής έρχεται από Strapi Single Type «Homepage».
 * Έτοιμα τμήματα: movies_today, summer_cinema, summer_venues, tours,
 * new_movies (τελευταίες 10 ημέρες release date), movies_week (ερχόμενη εβδομάδα κινηματογράφου Πέμ–Τετ),
 * coming_soon (κυκλοφορίες μετά από αυτή την εβδομάδα) — διάλεξε ποια εμφανίζονται και με ποια σειρά.
 */

export const HOME_SECTION_IDS = [
  "hero",
  "strip",
  "movies_today",
  "summer_cinema",
  "summer_venues",
  "tours",
  "new_movies",
  "movies_week",
  "coming_soon",
  "dining",
  "newsletter",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

/** Προεπιλογή όταν δεν υπάρχει εγγραφή CMS (χωρίς new_movies/movies_week για ελαφρύτερη αρχική) */
export const FALLBACK_SECTIONS: HomeSectionId[] = [
  "hero",
  "strip",
  "movies_today",
  "summer_cinema",
  "summer_venues",
  "tours",
  "dining",
  "newsletter",
];

/** Παλιά κλειδιά πριν το split σε summer_cinema / tours */
const LEGACY_SECTION_MAP: Record<string, HomeSectionId> = {
  movies: "summer_cinema",
  theater: "tours",
};

export function isHomeSectionId(id: string): id is HomeSectionId {
  return (HOME_SECTION_IDS as readonly string[]).includes(id);
}

/** Μετατροπή τιμής από Strapi (συμπ. παλιά saves) → τρέχον id */
export function normalizeHomeSectionId(raw: string): HomeSectionId | null {
  const k = raw.trim();
  const mapped = LEGACY_SECTION_MAP[k] ?? k;
  return isHomeSectionId(mapped) ? mapped : null;
}

/** Αποτέλεσμα mapping από το Strapi REST */
export interface MappedHomepage {
  sections: HomeSectionId[];
  heroTheaterSlug: string | null;
  heroMovieSlug: string | null;
  featuredMovieIndex: number;
  /** Από `populate[priority_movie]=*` — προτεραιότητα hero αν η ταινία έχει `most_talked_about`. */
  priorityMovieGenre: string | null;
  /** Από το συνδεδεμένο priority θεατρικό — εμφάνιση είδους στο Hero. */
  priorityTheaterGenre: string | null;
}

export interface ResolvedHomepageLayout extends MappedHomepage {}

/** Ενοποίηση: κενές λίστες ή null → προεπιλογές */
export function resolveHomepageLayout(mapped: MappedHomepage | null): ResolvedHomepageLayout {
  const base: ResolvedHomepageLayout = {
    sections: [...FALLBACK_SECTIONS],
    heroTheaterSlug: null,
    heroMovieSlug: null,
    featuredMovieIndex: 2,
    priorityMovieGenre: null,
    priorityTheaterGenre: null,
  };
  if (!mapped) return base;
  return {
    sections: mapped.sections.length > 0 ? mapped.sections : [...FALLBACK_SECTIONS],
    heroTheaterSlug: mapped.heroTheaterSlug ?? null,
    heroMovieSlug: mapped.heroMovieSlug ?? null,
    featuredMovieIndex: Number.isFinite(mapped.featuredMovieIndex) ? mapped.featuredMovieIndex : 2,
    priorityMovieGenre: mapped.priorityMovieGenre ?? null,
    priorityTheaterGenre: mapped.priorityTheaterGenre ?? null,
  };
}

export function layoutShowsHero(layout: ResolvedHomepageLayout): boolean {
  return layout.sections.includes("hero");
}

export function homeNeedsVenues(sections: readonly HomeSectionId[]): boolean {
  return sections.includes("summer_venues") || sections.includes("summer_cinema");
}

export function homeNeedsTheater(sections: readonly HomeSectionId[]): boolean {
  return sections.includes("tours") || sections.includes("hero");
}

export function homeNeedsDining(sections: readonly HomeSectionId[]): boolean {
  return sections.includes("dining");
}

/** Προβολές για Hero / ταινίες σήμερα / θερινά / εβδομάδα / χώρους θερινών. */
export function homeNeedsShowtimes(sections: readonly HomeSectionId[]): boolean {
  return sections.some((id) =>
    ["hero", "movies_today", "summer_cinema", "summer_venues", "movies_week"].includes(id),
  );
}
