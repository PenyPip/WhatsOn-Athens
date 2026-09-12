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

export function filterEventsForWeekend(
  events: readonly StrapiEvent[],
  now = new Date(),
  limit = 6,
): StrapiEvent[] {
  return [...events]
    .filter((event) => eventOverlapsWeekend(event, now))
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (a.startDate || "").localeCompare(b.startDate || "");
    })
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
