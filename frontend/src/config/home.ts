/**
 * Το layout της αρχικής έρχεται από Strapi Single Type «Homepage».
 * Έτοιμα τμήματα: summer_cinema (θερινές ταινίες), summer_venues (χώροι ως θερινό στο CMS),
 * tours (περιοδείες), new_movies, movies_week — διάλεξε ποια εμφανίζονται και με ποια σειρά.
 */

export const HOME_SECTION_IDS = [
  "hero",
  "strip",
  "summer_cinema",
  "summer_venues",
  "tours",
  "new_movies",
  "movies_week",
  "dining",
  "newsletter",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

/** Προεπιλογή όταν δεν υπάρχει εγγραφή CMS (χωρίς new_movies/movies_week για ελαφρύτερη αρχική) */
export const FALLBACK_SECTIONS: HomeSectionId[] = [
  "hero",
  "strip",
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
}

export interface ResolvedHomepageLayout extends MappedHomepage {}

/** Ενοποίηση: κενές λίστες ή null → προεπιλογές */
export function resolveHomepageLayout(mapped: MappedHomepage | null): ResolvedHomepageLayout {
  const base: ResolvedHomepageLayout = {
    sections: [...FALLBACK_SECTIONS],
    heroTheaterSlug: null,
    heroMovieSlug: null,
    featuredMovieIndex: 2,
  };
  if (!mapped) return base;
  return {
    sections: mapped.sections.length > 0 ? mapped.sections : [...FALLBACK_SECTIONS],
    heroTheaterSlug: mapped.heroTheaterSlug ?? null,
    heroMovieSlug: mapped.heroMovieSlug ?? null,
    featuredMovieIndex: Number.isFinite(mapped.featuredMovieIndex) ? mapped.featuredMovieIndex : 2,
  };
}

export function layoutShowsHero(layout: ResolvedHomepageLayout): boolean {
  return layout.sections.includes("hero");
}
