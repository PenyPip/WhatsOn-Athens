/** React Query — CMS περιεχόμενο (εστιατόρια, αρχική κ.λπ.): φρέσκα μετά από αλλαγές. */
export const CONTENT_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
} as const;
