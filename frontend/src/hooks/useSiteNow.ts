import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BOOTSTRAP_NOW_QUERY_KEY } from "@/lib/siteClock";
import { useIsHydrated } from "@/hooks/useIsHydrated";

/**
 * «Τώρα» για φίλτρα ημερομηνίας:
 * - πριν hydrate → frozen bootstrap timestamp (ίδιο με static HTML)
 * - μετά hydrate → πραγματική ώρα browser
 */
export function useSiteNow(): Date {
  const hydrated = useIsHydrated();
  const qc = useQueryClient();
  const bootstrapMs = qc.getQueryData<number>(BOOTSTRAP_NOW_QUERY_KEY);

  return useMemo(() => {
    if (!hydrated && bootstrapMs != null) return new Date(bootstrapMs);
    return new Date();
  }, [hydrated, bootstrapMs]);
}
