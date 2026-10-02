import type { StrapiTheaterPerformance, StrapiTheaterShow } from "@/lib/api";
import { formatLocalYmd } from "@/lib/theaterDateFilters";
import { filterVisibleTheaterShows } from "@/lib/theaterRunDates";
import {
  isTheaterPerformanceNewlyAdded,
  theaterShowHasNewlyAddedPerformances,
  theaterShowHasUpcomingPerformances,
} from "@/lib/theaterPerformances";

function performancesByShowSlug(
  performances: readonly StrapiTheaterPerformance[] | undefined,
): Map<string, StrapiTheaterPerformance[]> {
  const m = new Map<string, StrapiTheaterPerformance[]>();
  for (const p of performances ?? []) {
    const slug = p.theaterShowSlug?.trim();
    if (!slug) continue;
    const list = m.get(slug) ?? [];
    list.push(p);
    m.set(slug, list);
  }
  return m;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Επόμενες 7 μέρες από σήμερα (τοπική ζώνη), inclusive. */
export function theaterUpcomingWeekBounds(now = new Date()): { fromYmd: string; toYmd: string } {
  const from = startOfLocalDay(now);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { fromYmd: formatLocalYmd(from), toYmd: formatLocalYmd(to) };
}

function ymdInRange(ymd: string, fromYmd: string, toYmd: string): boolean {
  return ymd >= fromYmd && ymd <= toYmd;
}

function earliestPerformance(
  perfs: StrapiTheaterPerformance[],
): StrapiTheaterPerformance | null {
  if (!perfs.length) return null;
  return (
    [...perfs].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    )[0] ?? null
  );
}

/**
 * Νέες ημερομηνίες σε υπάρχον έργο, ή ολοκαίνουργιο listing
 * (όλες οι παραστάσεις μπήκαν τις τελευταίες ~7 μέρες).
 */
export function theaterShowIsNewlyListedOrUpdated(
  performances: StrapiTheaterPerformance[],
  now = new Date(),
): boolean {
  if (!theaterShowHasUpcomingPerformances(performances)) return false;
  if (theaterShowHasNewlyAddedPerformances(performances, now)) return true;
  if (performances.length === 0) return false;
  return performances.every((p) => isTheaterPerformanceNewlyAdded(p, now));
}

/**
 * Παραστάσεις με νέες ημερομηνίες / καινούργια listings — για αρχική.
 */
export function filterTheaterShowsNewlyAdded(
  shows: readonly StrapiTheaterShow[],
  performances?: readonly StrapiTheaterPerformance[],
  now = new Date(),
): StrapiTheaterShow[] {
  const bySlug = performancesByShowSlug(performances);
  return filterVisibleTheaterShows(shows)
    .filter((s) => theaterShowIsNewlyListedOrUpdated(bySlug.get(s.slug) ?? [], now))
    .sort((a, b) => {
      const aPerfs = bySlug.get(a.slug) ?? [];
      const bPerfs = bySlug.get(b.slug) ?? [];
      const aMax = Math.max(
        0,
        ...aPerfs.map((p) => (p.createdAt ? new Date(p.createdAt).getTime() : 0)),
      );
      const bMax = Math.max(
        0,
        ...bPerfs.map((p) => (p.createdAt ? new Date(p.createdAt).getTime() : 0)),
      );
      return bMax - aMax;
    });
}

/**
 * Παραστάσεις που ξεκινάνε στις επόμενες 7 μέρες (πρώτη ημερομηνία run στο παράθυρο).
 */
export function filterTheaterShowsStartingSoon(
  shows: readonly StrapiTheaterShow[],
  performances?: readonly StrapiTheaterPerformance[],
  now = new Date(),
): StrapiTheaterShow[] {
  const bySlug = performancesByShowSlug(performances);
  const { fromYmd, toYmd } = theaterUpcomingWeekBounds(now);
  return filterVisibleTheaterShows(shows)
    .filter((s) => {
      const perfs = bySlug.get(s.slug) ?? [];
      if (!theaterShowHasUpcomingPerformances(perfs)) return false;
      const first = earliestPerformance(perfs);
      if (!first) return false;
      const ymd = first.datetime.slice(0, 10);
      return ymdInRange(ymd, fromYmd, toYmd);
    })
    .sort((a, b) => {
      const aFirst = earliestPerformance(bySlug.get(a.slug) ?? []);
      const bFirst = earliestPerformance(bySlug.get(b.slug) ?? []);
      const ta = aFirst ? new Date(aFirst.datetime).getTime() : 0;
      const tb = bFirst ? new Date(bFirst.datetime).getTime() : 0;
      return ta - tb;
    });
}
