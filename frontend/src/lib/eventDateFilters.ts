import type { StrapiEvent } from "@/lib/api";
import { formatLocalYmd, upcomingWeekendDays } from "@/lib/theaterDateFilters";

/** YYYY-MM-DD εύρος τρέχοντος ή επερχόμενου Σαββατοκύριακου. */
export function upcomingWeekendYmdRange(now = new Date()): { from: string; to: string } {
  const days = upcomingWeekendDays(now);
  return {
    from: formatLocalYmd(days[0]!),
    to: formatLocalYmd(days[days.length - 1]!),
  };
}

function eventDayBounds(event: Pick<StrapiEvent, "startDate" | "endDate">): {
  start: string;
  end: string;
} | null {
  const start = event.startDate?.trim().slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const endRaw = event.endDate?.trim().slice(0, 10) ?? "";
  const end = /^\d{4}-\d{2}-\d{2}$/.test(endRaw) ? endRaw : start;
  return start <= end ? { start, end } : { start: end, end: start };
}

/** Το event καλύπτει τουλάχιστον μία μέρα του τρέχοντος/επερχόμενου ΣΚ. */
export function eventOverlapsWeekend(
  event: Pick<StrapiEvent, "startDate" | "endDate">,
  now = new Date(),
): boolean {
  const bounds = eventDayBounds(event);
  if (!bounds) return false;
  const { from, to } = upcomingWeekendYmdRange(now);
  return bounds.start <= to && bounds.end >= from;
}

/** Τέλος πριν από σήμερα (τοπική μέρα). Πολυήμερο που περιλαμβάνει σήμερα μένει ενεργό. */
export function eventHasPassed(
  event: Pick<StrapiEvent, "startDate" | "endDate">,
  now = new Date(),
): boolean {
  const bounds = eventDayBounds(event);
  if (!bounds) return false;
  return bounds.end < formatLocalYmd(now);
}

function compareEventsByStartAsc(
  a: Pick<StrapiEvent, "startDate">,
  b: Pick<StrapiEvent, "startDate">,
): number {
  return (a.startDate || "").localeCompare(b.startDate || "");
}

function compareEventsByStartDesc(
  a: Pick<StrapiEvent, "startDate">,
  b: Pick<StrapiEvent, "startDate">,
): number {
  return (b.startDate || "").localeCompare(a.startDate || "");
}

/** Τρέχοντα από το πιο κοντινό. Παρελθόντα από το πιο πρόσφατο, για το αρχείο. */
export function splitEventsChronologically(
  events: readonly StrapiEvent[],
  now = new Date(),
): { upcoming: StrapiEvent[]; past: StrapiEvent[] } {
  const upcoming: StrapiEvent[] = [];
  const past: StrapiEvent[] = [];
  for (const event of events) {
    if (eventHasPassed(event, now)) past.push(event);
    else upcoming.push(event);
  }
  upcoming.sort(compareEventsByStartAsc);
  past.sort(compareEventsByStartDesc);
  return { upcoming, past };
}

/** Το event περιλαμβάνει τη σημερινή τοπική μέρα (και πολυήμερα που πέφτουν σήμερα). */
export function eventOverlapsToday(
  event: Pick<StrapiEvent, "startDate" | "endDate">,
  now = new Date(),
): boolean {
  const bounds = eventDayBounds(event);
  if (!bounds) return false;
  const today = formatLocalYmd(now);
  return bounds.start <= today && bounds.end >= today;
}

export function filterEventsForToday(
  events: readonly StrapiEvent[],
  now = new Date(),
  limit = 6,
): StrapiEvent[] {
  return [...events]
    .filter((event) => eventOverlapsToday(event, now))
    .sort(compareEventsByStartAsc)
    .slice(0, Math.max(0, limit));
}

export function formatTodayLabel(now = new Date()): string {
  return now.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" });
}

export function filterEventsForWeekend(
  events: readonly StrapiEvent[],
  now = new Date(),
  limit = 6,
): StrapiEvent[] {
  return [...events]
    .filter((event) => eventOverlapsWeekend(event, now))
    .sort(compareEventsByStartAsc)
    .slice(0, Math.max(0, limit));
}

/** Σύντομη ετικέτα εύρους ΣΚ για eyebrow (π.χ. «12–13 Σεπ»). */
export function formatWeekendRangeLabel(now = new Date()): string {
  const days = upcomingWeekendDays(now);
  const fmt = (d: Date) =>
    d.toLocaleDateString("el-GR", { day: "numeric", month: "short" }).replace(/\.$/, "");
  if (days.length === 1) return fmt(days[0]!);
  return `${fmt(days[0]!)}–${fmt(days[days.length - 1]!)}`;
}
