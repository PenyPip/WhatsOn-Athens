/** React Query — πρόγραμμα/προβολές: πάντα φρέσκα μετά από αλλαγές στο CMS. */
export const PROGRAM_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;
