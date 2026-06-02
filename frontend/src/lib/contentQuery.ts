/** React Query — CMS περιεχόμενο (εστιατόρια, αρχική κ.λπ.): φρέσκα μετά από αλλαγές. */
export const CONTENT_QUERY_OPTIONS = {
  staleTime: 120_000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;
