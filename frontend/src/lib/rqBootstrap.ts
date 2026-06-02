import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiMovie } from "@/lib/api";

export function readRqBootstrapState(): DehydratedState | undefined {
  if (typeof document === "undefined") return undefined;
  const el = document.getElementById("__RQ_STATE__");
  if (!el?.textContent) return undefined;
  try {
    return JSON.parse(el.textContent) as DehydratedState;
  } catch {
    return undefined;
  }
}

const HOME_BOOTSTRAP_QUERY_KEYS = new Set(["homepage", "movies", "showtimes"]);

/** Μικρότερο bootstrap στην αρχική — venues/extra φορτώνονται μετά το πρώτο paint. */
export function slimHomeBootstrapState(
  state: DehydratedState,
  extraKeys: readonly string[] = [],
): DehydratedState {
  const allowed = new Set([...HOME_BOOTSTRAP_QUERY_KEYS, ...extraKeys]);
  return {
    ...state,
    queries: state.queries.filter((q) => allowed.has(String(q.queryKey[0]))),
  };
}

export function moviesFromDehydratedState(
  state: DehydratedState,
): Pick<StrapiMovie, "slug" | "title">[] {
  const entry = state.queries.find((q) => q.queryKey[0] === "movies");
  const data = entry?.state?.data;
  if (!Array.isArray(data)) return [];
  return data
    .filter((m): m is StrapiMovie => m && typeof m === "object" && "slug" in m)
    .map((m) => ({ slug: m.slug, title: m.title }));
}
