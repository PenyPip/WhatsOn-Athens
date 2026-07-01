import type { StrapiTheaterPerformance, StrapiVenue } from "@/lib/api";
import type { ScheduleSlot } from "@/lib/showtimeSchedule";
import {
  formatShowtimeWeekRangeLabel,
  showtimeIsUpcoming,
  showtimeIsWeekBlock,
} from "@/lib/showtimeSchedule";

export function theaterVenueGroupKey(p: StrapiTheaterPerformance): string {
  if (p.venueSlug?.trim()) return p.venueSlug.trim();
  if (p.venueId != null) return `v:${Number(p.venueId)}`;
  return `n:${(p.venue || "unknown").trim().toLowerCase()}`;
}

export function resolveVenueForPerformance(
  p: StrapiTheaterPerformance,
  venues: StrapiVenue[],
): StrapiVenue | undefined {
  const slug = p.venueSlug?.trim();
  if (slug && venues.length) {
    const bySlug = venues.find((v) => v.slug?.trim() === slug);
    if (bySlug) return bySlug;
  }
  if (p.venueId != null && venues.length) {
    return venues.find((v) => Number(v.id) === Number(p.venueId));
  }
  return undefined;
}

export type TheaterPerformanceVenueGroup = {
  key: string;
  venueName: string;
  slots: StrapiTheaterPerformance[];
  venue?: StrapiVenue;
};

function earliestPerformanceMs(slots: StrapiTheaterPerformance[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const p of slots) {
    const t = new Date(p.datetime).getTime();
    if (!Number.isNaN(t)) min = Math.min(min, t);
  }
  return min;
}

/** Ταξινόμηση χώρων: πρώτα αυτός με την πλησιέστερη επερχόμενη ημερομηνία παράστασης. */
function compareVenueGroupsByPerformanceDate(
  a: TheaterPerformanceVenueGroup,
  b: TheaterPerformanceVenueGroup,
): number {
  const ta = earliestPerformanceMs(a.slots);
  const tb = earliestPerformanceMs(b.slots);
  if (ta !== tb) return ta - tb;
  return a.venueName.localeCompare(b.venueName, "el");
}

export function groupTheaterPerformancesByVenue(
  list: StrapiTheaterPerformance[],
  venues: StrapiVenue[] = [],
): TheaterPerformanceVenueGroup[] {
  const m = new Map<string, StrapiTheaterPerformance[]>();
  for (const p of list) {
    const key = theaterVenueGroupKey(p);
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(p);
  }
  return [...m.entries()]
    .map(([key, slots]) => {
      const sorted = [...slots].sort(
        (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
      );
      const linked = resolveVenueForPerformance(sorted[0], venues);
      const venueName = linked?.name?.trim() || sorted[0].venue?.trim() || "Χώρος";
      return { key, venueName, slots: sorted, venue: linked };
    })
    .sort(compareVenueGroupsByPerformanceDate);
}

const WEEKDAY_SHORT = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];

function formatPerformanceChip(p: StrapiTheaterPerformance): string {
  if (showtimeIsWeekBlock(p)) {
    const range = formatShowtimeWeekRangeLabel(p);
    return range ? `${range} · ${p.venue}` : p.venue;
  }
  const d = new Date(p.datetime);
  if (Number.isNaN(d.getTime())) return p.venue;
  const day = WEEKDAY_SHORT[d.getDay()] ?? "";
  const time = d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const venueSuffix = p.venue?.trim() ? ` @ ${p.venue.trim()}` : "";
  return `${day} ${time}${venueSuffix}`;
}

export function theaterShowHasUpcomingPerformances(
  performances: StrapiTheaterPerformance[],
): boolean {
  return performances.some((p) => showtimeIsUpcoming(p));
}

/** Σύντομη γραμμή για κάρτα λίστας θεάτρου. */
export function theaterPerformanceSummary(
  performances: StrapiTheaterPerformance[],
  maxParts = 3,
): string | null {
  const upcoming = performances
    .filter((p) => showtimeIsUpcoming(p))
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  if (!upcoming.length) return null;
  const parts = upcoming.slice(0, maxParts).map(formatPerformanceChip);
  const extra = upcoming.length > maxParts ? ` +${upcoming.length - maxParts}` : "";
  return parts.join(" · ") + extra;
}

export type TheaterVenueShowGroup = {
  key: string;
  theaterShowSlug: string;
  theaterShowTitle: string;
  posterUrl?: string | null;
  soldOut?: boolean;
  slots: StrapiTheaterPerformance[];
};

/** Ομαδοποίηση εμφανίσεων χώρου ανά παράσταση (σελίδα /theater/venue/…). */
export function groupPerformancesByShowAtVenue(
  performances: StrapiTheaterPerformance[],
): TheaterVenueShowGroup[] {
  const m = new Map<string, StrapiTheaterPerformance[]>();
  for (const p of performances) {
    if (!showtimeIsUpcoming(p)) continue;
    const slug = p.theaterShowSlug?.trim();
    const key = slug || (p.theaterShowId != null ? `id:${p.theaterShowId}` : `row:${p.id}`);
    const list = m.get(key) ?? [];
    list.push(p);
    m.set(key, list);
  }

  return [...m.entries()]
    .map(([key, slots]) => {
      const sorted = [...slots].sort(
        (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
      );
      const head = sorted[0];
      return {
        key,
        theaterShowSlug: head.theaterShowSlug?.trim() || "",
        theaterShowTitle: head.theaterShowTitle?.trim() || "Παράσταση",
        posterUrl: head.theaterShowPosterUrl ?? null,
        soldOut: head.theaterShowSoldOut,
        slots: sorted,
      };
    })
    .sort((a, b) => {
      const ta = a.slots[0] ? new Date(a.slots[0].datetime).getTime() : 0;
      const tb = b.slots[0] ? new Date(b.slots[0].datetime).getTime() : 0;
      return ta - tb;
    });
}

export function performanceOverlapsDateRange(
  p: ScheduleSlot,
  fromYmd: string,
  toYmd: string,
): boolean {
  if (!fromYmd && !toYmd) return true;
  const fromMs = fromYmd ? Date.parse(`${fromYmd}T00:00:00`) : Number.NEGATIVE_INFINITY;
  const toMs = toYmd ? Date.parse(`${toYmd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
  if (showtimeIsWeekBlock(p)) {
    const startMs = Date.parse(`${p.datetime.slice(0, 10)}T00:00:00`);
    const endRaw = (p.weekEnd ?? p.datetime).slice(0, 10);
    const endMs = Date.parse(`${endRaw}T23:59:59.999`);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return true;
    return startMs <= toMs && endMs >= fromMs;
  }
  const dt = new Date(p.datetime);
  const t = dt.getTime();
  if (Number.isNaN(t)) return true;
  return t >= fromMs && t <= toMs;
}
