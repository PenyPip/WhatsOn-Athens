import type { DehydratedState, QueryClient } from "@tanstack/react-query";

/** Frozen «τώρα» από build-time prefetch — ίδιο SSR + πρώτο client render (χωρίς hydration mismatch). */
export const BOOTSTRAP_NOW_QUERY_KEY = ["bootstrapNow"] as const;

export function stampBootstrapNow(qc: QueryClient): void {
  qc.setQueryData(BOOTSTRAP_NOW_QUERY_KEY, Date.now());
}

export function readBootstrapNowMs(state?: DehydratedState): number | undefined {
  const entry = state?.queries.find(
    (q) => Array.isArray(q.queryKey) && q.queryKey[0] === BOOTSTRAP_NOW_QUERY_KEY[0],
  );
  const v = entry?.state?.data;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
