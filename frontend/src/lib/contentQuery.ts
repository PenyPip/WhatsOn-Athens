/**
 * React Query - CMS περιεχόμενο στο critical path (ταινίες αρχικής κ.λπ.).
 * Λίστες που αλλάζουν συχνά (venues/πρόγραμμα) κάνουν override στα hooks.
 */
export const CONTENT_QUERY_OPTIONS = {
  staleTime: 6 * 60 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;
