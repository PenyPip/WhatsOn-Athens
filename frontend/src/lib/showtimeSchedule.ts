import type { StrapiShowtime } from "@/lib/api";

export type ShowtimeScheduleKind = "exact" | "week_block";

export function showtimeIsWeekBlock(st: Pick<StrapiShowtime, "scheduleKind">): boolean {
  return st.scheduleKind === "week_block";
}

/** Τοπική ημέρα 00:00 από ISO datetime ή YYYY-MM-DD. */
export function parseShowtimeLocalDay(raw: string | undefined): Date | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  const datePart = s.length >= 10 ? s.slice(0, 10) : s;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const [y, m, day] = datePart.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

export function endOfLocalDay(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setHours(23, 59, 59, 999);
  return out;
}

/** Εύρος ημερομηνιών για week_block (συμπεριλαμβάνεται η τελευταία μέρα). */
export function showtimeWeekRange(st: StrapiShowtime): { start: Date; end: Date } | null {
  if (!showtimeIsWeekBlock(st)) return null;
  const start = parseShowtimeLocalDay(st.datetime);
  const endDay = parseShowtimeLocalDay(st.weekEnd ?? st.datetime);
  if (!start || !endDay) return null;
  const end = endOfLocalDay(endDay);
  if (end.getTime() < start.getTime()) return null;
  return { start, end };
}

export function showtimeIsUpcoming(st: StrapiShowtime, now = new Date()): boolean {
  const range = showtimeWeekRange(st);
  if (range) return range.end.getTime() >= now.getTime();
  const dt = new Date(st.datetime);
  const t = dt.getTime();
  return !Number.isNaN(t) && t >= now.getTime();
}

/** Επικάλυψη προβολής με διάστημα [rangeStart, rangeEnd]. */
export function showtimeOverlapsRange(
  st: StrapiShowtime,
  rangeStart: Date,
  rangeEnd: Date,
  now = new Date(),
): boolean {
  const range = showtimeWeekRange(st);
  if (range) {
    if (range.end.getTime() < now.getTime()) return false;
    return range.start.getTime() <= rangeEnd.getTime() && range.end.getTime() >= rangeStart.getTime();
  }
  const dt = new Date(st.datetime);
  if (Number.isNaN(dt.getTime())) return false;
  if (dt.getTime() < now.getTime()) return false;
  const t = dt.getTime();
  return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
}

const RANGE_DATE_OPTS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
const RANGE_DATE_YEAR_OPTS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

function formatRangeDay(d: Date, withYear: boolean): string {
  return d.toLocaleDateString("el-GR", withYear ? RANGE_DATE_YEAR_OPTS : RANGE_DATE_OPTS);
}

/** «22 Μαΐ – 28 Μαΐ 2026» ή «22 Μαΐ 2026» αν μία μέρα. */
export function formatShowtimeWeekRangeLabel(st: StrapiShowtime): string | null {
  const range = showtimeWeekRange(st);
  if (!range) return null;
  const sameDay =
    range.start.getFullYear() === range.end.getFullYear() &&
    range.start.getMonth() === range.end.getMonth() &&
    range.start.getDate() === range.end.getDate();
  const crossYear = range.start.getFullYear() !== range.end.getFullYear();
  const fromStr = formatRangeDay(range.start, crossYear);
  const toStr = formatRangeDay(range.end, crossYear);
  if (sameDay) return fromStr;
  return `${fromStr} – ${toStr}`;
}
