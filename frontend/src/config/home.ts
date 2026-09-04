/**
 * Το layout της αρχικής έρχεται από Strapi Single Type «Homepage».
 * Έτοιμα τμήματα: hero, movies_today, summer_cinema, summer_venues, tours (παραστάσεις με on_tour),
 * events (πολιτιστικά events), new_movies (τελευταίες 10 ημέρες release date), movies_week (ερχόμενη εβδομάδα κινηματογράφου Πέμ–Τετ),
 * coming_soon (κυκλοφορίες μετά από αυτή την εβδομάδα) - διάλεξε ποια εμφανίζονται και με ποια σειρά.
 */

export const HOME_SECTION_IDS = [
  "hero",
  "strip",
  "movies_today",
  "summer_cinema",
  "summer_venues",
  "tours",
  "new_movies",
  "new_articles",
  "events",
  "movies_week",
  "coming_soon",
  "dining",
  "newsletter",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

/**
 * Πρώτο βλέμμα αρχικής: hero → shortcuts → «απόψε» → θερινά.
 * Τα υπόλοιπα (εβδομάδα, χώροι, περιοδείες…) μένουν στη σχετική σειρά του CMS, πιο κάτω.
 */
export const HOME_FIRST_LOOK_SECTIONS: readonly HomeSectionId[] = [
  "hero",
  "strip",
  "movies_today",
  "summer_cinema",
];

/** Προεπιλογή όταν δεν υπάρχει εγγραφή CMS (χωρίς new_movies για ελαφρύτερη αρχική) */
export const FALLBACK_SECTIONS: HomeSectionId[] = [
  "hero",
  "strip",
  "movies_today",
  "summer_cinema",
  "summer_venues",
  "movies_week",
  "tours",
  "new_articles",
  "events",
  "dining",
  "newsletter",
];

/** Βάζει τα 1–2 ισχυρά movie blocks αμέσως μετά hero/strip - λιγότερος θόρυβος στο fold. */
export function orderHomeSectionsForFirstLook(sections: HomeSectionId[]): HomeSectionId[] {
  const present = new Set(sections);
  const out: HomeSectionId[] = [];
  for (const id of HOME_FIRST_LOOK_SECTIONS) {
    if (present.has(id)) out.push(id);
  }
  const placed = new Set(out);
  for (const id of sections) {
    if (!placed.has(id)) out.push(id);
  }
  return out;
}

/** Events εμφανίζονται πάντα αμέσως μετά τα άρθρα όταν υπάρχει μπλοκ new_articles. */
function ensureEventsAfterArticles(sections: HomeSectionId[]): HomeSectionId[] {
  const articlesIdx = sections.indexOf("new_articles");
  if (articlesIdx === -1) return sections;

  const withoutEvents = sections.filter((id) => id !== "events");
  const anchor = withoutEvents.indexOf("new_articles");
  if (anchor === -1) return sections;

  const next: HomeSectionId[] = [...withoutEvents];
  next.splice(anchor + 1, 0, "events");
  return next;
}

/** Παλιά κλειδιά πριν το split σε summer_cinema / tours */
const LEGACY_SECTION_MAP: Record<string, HomeSectionId> = {
  movies: "summer_cinema",
  theater: "tours",
  new: "new_articles",
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
}

export interface ResolvedHomepageLayout extends MappedHomepage {}

/** Ενοποίηση: κενές λίστες ή null → προεπιλογές */
export function resolveHomepageLayout(mapped: MappedHomepage | null): ResolvedHomepageLayout {
  const base = mapped?.sections.length ? mapped.sections : [...FALLBACK_SECTIONS];
  return { sections: ensureEventsAfterArticles(orderHomeSectionsForFirstLook(base)) };
}

export function layoutShowsHero(layout: ResolvedHomepageLayout): boolean {
  return layout.sections.includes("hero");
}

export function homeNeedsVenues(sections: readonly HomeSectionId[]): boolean {
  return sections.includes("summer_venues") || sections.includes("summer_cinema");
}

export function homeNeedsTheater(sections: readonly HomeSectionId[]): boolean {
  return sections.includes("tours");
}

export function homeNeedsEvents(sections: readonly HomeSectionId[]): boolean {
  return sections.includes("events");
}

export function homeNeedsDining(sections: readonly HomeSectionId[]): boolean {
  return sections.includes("dining");
}

export function homeNeedsArticles(sections: readonly HomeSectionId[]): boolean {
  return sections.includes("new_articles");
}

/** Προβολές για ταινίες σήμερα / θερινά / εβδομάδα / χώρους θερινών (όχι hero - μόνο `most_talked_about`). */
export function homeNeedsShowtimes(sections: readonly HomeSectionId[]): boolean {
  return sections.some((id) =>
    ["movies_today", "summer_cinema", "summer_venues", "movies_week"].includes(id),
  );
}

/** Πλήρες catalog ταινιών (release date κ.λπ.) - όχι για απλές σειρές από showtimes. */
export function homeNeedsFullMovieCatalog(sections: readonly HomeSectionId[]): boolean {
  return sections.some((id) => ["new_movies", "movies_week", "coming_soon"].includes(id));
}
