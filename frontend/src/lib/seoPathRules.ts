import { staticPageSeo } from "@/lib/pageSeoCopy";

/** Κανονικοποίηση pathname χωρίς query/hash. */
export function normalizeSeoPath(path: string): string {
  if (!path || path === "") return "/";
  const base = path.split("?")[0].split("#")[0];
  return base.startsWith("/") ? base : `/${base}`;
}

/** Σελίδες που δεν πρέπει να indexάρονται (στο build HTML). */
export function shouldNoIndexPath(path: string): boolean {
  const normalized = normalizeSeoPath(path);
  if (normalized === staticPageSeo.profile.path) return true;
  return false;
}
