import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiMovie } from "@/lib/api";

declare global {
  interface Window {
    /** Γεμίζει από `/_rq/*.json` fetch (postbuild) - όχι blocking script στο critical path. */
    __RQ_BOOTSTRAP__?: DehydratedState;
  }
}

export function readRqBootstrapState(): DehydratedState | undefined {
  if (typeof window !== "undefined" && window.__RQ_BOOTSTRAP__) {
    return window.__RQ_BOOTSTRAP__;
  }
  if (typeof document === "undefined") return undefined;
  const el = document.getElementById("__RQ_STATE__");
  if (!el?.textContent) return undefined;
  try {
    const parsed = JSON.parse(el.textContent) as DehydratedState;
    if (!parsed?.queries?.length) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/** URL του external bootstrap (postbuild `data-rq-src`). */
export function rqBootstrapSrc(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const el = document.getElementById("__RQ_STATE__");
  const src = el?.getAttribute("data-rq-src")?.trim();
  return src || undefined;
}

/**
 * Φέρνει το RQ bootstrap. Δεν μπλοκάρει το πρώτο parse (σε αντίθεση με inline/blocking script).
 */
export async function loadRqBootstrapState(): Promise<DehydratedState | undefined> {
  const cached = readRqBootstrapState();
  if (cached) return cached;

  const src = rqBootstrapSrc();
  if (!src) return undefined;

  try {
    const res = await fetch(src, { credentials: "same-origin" });
    if (!res.ok) return undefined;
    const data = (await res.json()) as DehydratedState;
    if (!data?.queries?.length) return undefined;
    if (typeof window !== "undefined") window.__RQ_BOOTSTRAP__ = data;
    return data;
  } catch {
    return undefined;
  }
}

/** Μετά το LCP (ή timeout) - για αρχική με static hero. */
export function runAfterHomeLcp(cb: () => void, fallbackMs = 2500): () => void {
  if (typeof document === "undefined") {
    cb();
    return () => {};
  }
  if (document.documentElement.classList.contains("spa-lcp-done")) {
    cb();
    return () => {};
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    obs.disconnect();
    clearTimeout(timer);
    cb();
  };

  const obs = new MutationObserver(() => {
    if (document.documentElement.classList.contains("spa-lcp-done")) finish();
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const timer = window.setTimeout(finish, fallbackMs);
  return () => {
    done = true;
    obs.disconnect();
    clearTimeout(timer);
  };
}

const HOME_BOOTSTRAP_QUERY_KEYS = new Set(["homepage", "movies", "bootstrapNow"]);

/**
 * Μικρότερο bootstrap στην αρχική - χωρίς showtimes στο `#__RQ_STATE__` (TBT/LCP).
 * Το crawl HTML χτίζεται από το raw prefetch πριν από αυτό· ο client φορτώνει
 * πλήρες home-calendar μετά το LCP (`deferProgramData`).
 * Μην ξαναβάλεις showtimes εδώ + date-trim + staleTime 6h - κόβει προβολές.
 */
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
