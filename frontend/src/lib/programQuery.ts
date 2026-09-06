/**
 * React Query - πρόγραμμα/προβολές στο critical path (π.χ. home bootstrap).
 * Τα hooks λίστας (/theater, /movies, venues) κάνουν override σε ~60s + refetchOnMount
 * ώστε αλλαγές CMS να φαίνονται χωρίς να περιμένουν rebuild / 6h.
 */
export const PROGRAM_QUERY_OPTIONS = {
  staleTime: 6 * 60 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;

/** Κοινό cache key για home-calendar (αρχική, /movies, λεπτομέρεια ταινίας). */
export const SHOWTIMES_CALENDAR_QUERY_KEY = ["showtimes", "calendar"] as const;

/** Κοινό cache key για θεατρικές παραστάσεις (λίστα, λεπτομέρεια). */
export const THEATER_PERFORMANCES_CALENDAR_QUERY_KEY = ["theaterPerformances", "calendar"] as const;

/** Venues χωρίς day_prices - φίλτρα περιοχής / σύνδεσμοι προγράμματος. */
export const VENUES_PROGRAM_QUERY_KEY = ["venues", "program"] as const;
