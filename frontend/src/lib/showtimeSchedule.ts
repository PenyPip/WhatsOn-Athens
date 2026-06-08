export type ShowtimeScheduleKind = "exact" | "week_block";

/** Κοινά πεδία προβολής ταινίας / θεατρικής παράστασης. */
export type ScheduleSlot = {
  scheduleKind?: ShowtimeScheduleKind;
  datetime: string;
  weekEnd?: string;
};

export function showtimeIsWeekBlock(st: Pick<ScheduleSlot, "scheduleKind">): boolean {
  return st.scheduleKind === "week_block";
}

/**
 * Τοπική ημερολογιακή μέρα 00:00.
 * - `YYYY-MM-DD` (π.χ. week_end): ως ημερολογική ημερομηνία, χωρίς UTC offset.
 * - ISO datetime (π.χ. datetime από Strapi): ημέρα στο timezone του browser (Ελλάδα),
 *   όχι slice του UTC prefix — αλλιώς 28/5 00:00 → 27/5 στο site.
 */
export function parseShowtimeLocalDay(raw: string | undefined): Date | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split("-").map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day);
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfLocalDay(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setHours(23, 59, 59, 999);
  return out;
}

/** Εύρος ημερομηνιών για week_block (συμπεριλαμβάνεται η τελευταία μέρα). */
export function showtimeWeekRange(st: ScheduleSlot): { start: Date; end: Date } | null {
  if (!showtimeIsWeekBlock(st)) return null;
  const start = parseShowtimeLocalDay(st.datetime);
  const endDay = parseShowtimeLocalDay(st.weekEnd ?? st.datetime);
  if (!start || !endDay) return null;
  const end = endOfLocalDay(endDay);
  if (end.getTime() < start.getTime()) return null;
  return { start, end };
}

export function showtimeIsUpcoming(st: ScheduleSlot, now = new Date()): boolean {
  const range = showtimeWeekRange(st);
  if (range) return range.end.getTime() >= now.getTime();
  const dt = new Date(st.datetime);
  const t = dt.getTime();
  return !Number.isNaN(t) && t >= now.getTime();
}

/** Επικάλυψη προβολής με διάστημα [rangeStart, rangeEnd]. */
export function showtimeOverlapsRange(
  st: ScheduleSlot,
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

/** Προβολή ξεκινά αυστηρά μετά το τέλος του range (για «Προσεχώς» στη σελίδα ταινίας). */
export function showtimeStartsAfterRange(
  st: ScheduleSlot,
  rangeEnd: Date,
  now = new Date(),
): boolean {
  const range = showtimeWeekRange(st);
  if (range) {
    if (range.end.getTime() < now.getTime()) return false;
    return range.start.getTime() > rangeEnd.getTime();
  }
  const dt = new Date(st.datetime);
  if (Number.isNaN(dt.getTime())) return false;
  if (dt.getTime() < now.getTime()) return false;
  return dt.getTime() > rangeEnd.getTime();
}

const RANGE_DATE_OPTS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
const RANGE_DATE_YEAR_OPTS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

function formatRangeDay(d: Date, withYear: boolean): string {
  return d.toLocaleDateString("el-GR", withYear ? RANGE_DATE_YEAR_OPTS : RANGE_DATE_OPTS);
}

/** «22 Μαΐ – 28 Μαΐ 2026» ή «22 Μαΐ 2026» αν μία μέρα. */
/** Κάθε ημερολογιακή μέρα από start έως end (συμπεριλαμβάνεται). */
export function eachDayInclusiveInRange(start: Date, end: Date): Date[] {
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (to.getTime() < from.getTime()) return [];
  const out: Date[] = [];
  const cur = new Date(from);
  while (cur.getTime() <= to.getTime()) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function formatShowtimeWeekRangeLabel(st: ScheduleSlot): string | null {
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

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** week_block ενεργό σήμερα (συμπεριλαμβάνεται η τρέχουσα τοπική μέρα). */
export function showtimeWeekBlockOverlapsLocalDay(st: ScheduleSlot, day: Date): boolean {
  const range = showtimeWeekRange(st);
  if (!range) return false;
  const dayStart = startOfLocalDay(day);
  const dayEnd = endOfLocalDay(dayStart);
  return range.end.getTime() >= dayStart.getTime() && range.start.getTime() <= dayEnd.getTime();
}

export type MoviesDaySectionMeta = {
  sectionKey: string;
  sectionLabel: string;
  sectionDate: Date;
};

/** Ομαδοποίηση προβολής σε «Σήμερα» / «Αύριο» / ημερομηνία — τοπική μέρα, όχι UTC. */
export function moviesDaySectionMeta(
  st: ScheduleSlot & { venue?: string; venueId?: number; venueSlug?: string },
  now = new Date(),
): MoviesDaySectionMeta | null {
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrowStart = new Date(tomorrowStart);
  dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);

  const weekRange = showtimeWeekRange(st);
  let bucketDay: Date;

  if (weekRange) {
    if (showtimeWeekBlockOverlapsLocalDay(st, now)) {
      bucketDay = todayStart;
    } else {
      bucketDay = weekRange.start;
    }
  } else {
    const day = parseShowtimeLocalDay(st.datetime);
    if (!day) return null;
    if (day.getTime() < todayStart.getTime()) return null;
    bucketDay = day;
  }

  if (bucketDay.getTime() === todayStart.getTime()) {
    return { sectionKey: "today", sectionLabel: "Σήμερα", sectionDate: todayStart };
  }
  if (bucketDay.getTime() === tomorrowStart.getTime()) {
    return { sectionKey: "tomorrow", sectionLabel: "Αύριο", sectionDate: tomorrowStart };
  }
  return {
    sectionKey: localDayKey(bucketDay),
    sectionLabel: bucketDay.toLocaleDateString("el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    sectionDate: bucketDay,
  };
}
