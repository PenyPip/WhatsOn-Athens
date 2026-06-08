/** React Query — πρόγραμμα/προβολές: πάντα φρέσκα μετά από αλλαγές στο CMS. */
export const PROGRAM_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;

/** Κοινό cache key για home-calendar (αρχική, /movies, λεπτομέρεια ταινίας). */
export const SHOWTIMES_CALENDAR_QUERY_KEY = ["showtimes", "calendar"] as const;

/** Κοινό cache key για θεατρικές παραστάσεις (λίστα, λεπτομέρεια). */
export const THEATER_PERFORMANCES_CALENDAR_QUERY_KEY = ["theaterPerformances", "calendar"] as const;

/** Venues χωρίς day_prices — φίλτρα περιοχής / σύνδεσμοι προγράμματος. */
export const VENUES_PROGRAM_QUERY_KEY = ["venues", "program"] as const;
