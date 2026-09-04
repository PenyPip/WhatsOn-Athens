/** React Query - CMS περιεχόμενο (εστιατόρια, αρχική κ.λπ.): φρέσκα μετά από αλλαγές. */
export const CONTENT_QUERY_OPTIONS = {
  staleTime: 6 * 60 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;
