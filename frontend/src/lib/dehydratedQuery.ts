import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiShowtime, StrapiVenue } from "@/lib/api";
import { SHOWTIMES_CALENDAR_QUERY_KEY, VENUES_PROGRAM_QUERY_KEY } from "@/lib/programQuery";

export function queryDataByKey<T>(state: DehydratedState, key: string): T | undefined {
  const entry = state.queries.find((q) => Array.isArray(q.queryKey) && q.queryKey[0] === key);
  if (!entry || entry.state.status !== "success") return undefined;
  return entry.state.data as T;
}

export function showtimesFromDehydrated(state: DehydratedState): StrapiShowtime[] {
  const calendar = state.queries.find(
    (q) => JSON.stringify(q.queryKey) === JSON.stringify(SHOWTIMES_CALENDAR_QUERY_KEY),
  );
  if (calendar?.state.status === "success" && Array.isArray(calendar.state.data)) {
    return calendar.state.data as StrapiShowtime[];
  }
  return queryDataByKey<StrapiShowtime[]>(state, "showtimes") ?? [];
}

export function venuesFromDehydrated(state: DehydratedState): StrapiVenue[] {
  const program = state.queries.find(
    (q) => JSON.stringify(q.queryKey) === JSON.stringify(VENUES_PROGRAM_QUERY_KEY),
  );
  if (program?.state.status === "success" && Array.isArray(program.state.data)) {
    return program.state.data as StrapiVenue[];
  }
  return queryDataByKey<StrapiVenue[]>(state, "venues") ?? [];
}
