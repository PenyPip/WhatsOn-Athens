/** React Query — πρόγραμμα/προβολές: πάντα φρέσκα μετά από αλλαγές στο CMS. */
export const PROGRAM_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
} as const;
