export type TheaterQuickDateFilter = "all" | "today" | "tomorrow" | "weekend";

export const THEATER_QUICK_DATE_OPTIONS: { value: TheaterQuickDateFilter; label: string }[] = [
  { value: "all", label: "Όλες" },
  { value: "today", label: "Σήμερα" },
  { value: "tomorrow", label: "Αύριο" },
  { value: "weekend", label: "ΣΚ" },
];

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Επερχόμενο Σαββατοκύριακο (Σάββατο + Κυριακή) — τοπική μέρα. */
export function upcomingWeekendDays(now = new Date()): Date[] {
  const todayStart = startOfLocalDay(now);
  const dow = todayStart.getDay();

  if (dow === 0) return [new Date(todayStart)];
  if (dow === 6) {
    const sun = new Date(todayStart);
    sun.setDate(sun.getDate() + 1);
    return [new Date(todayStart), sun];
  }

  const untilSat = 6 - dow;
  const sat = new Date(todayStart);
  sat.setDate(sat.getDate() + untilSat);
  const sun = new Date(sat);
  sun.setDate(sun.getDate() + 1);
  return [sat, sun];
}

export function theaterQuickDateRange(
  filter: TheaterQuickDateFilter,
  now = new Date(),
): { from: string; to: string } {
  if (filter === "all") return { from: "", to: "" };
  const today = startOfLocalDay(now);
  if (filter === "today") {
    const y = formatLocalYmd(today);
    return { from: y, to: y };
  }
  if (filter === "tomorrow") {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    const y = formatLocalYmd(t);
    return { from: y, to: y };
  }
  const days = upcomingWeekendDays(now);
  return { from: formatLocalYmd(days[0]), to: formatLocalYmd(days[days.length - 1]) };
}

export function normalizeTheaterDateRange(from: string, to: string): { from: string; to: string } {
  const f = from.trim();
  const t = to.trim();
  if (f && t && f > t) return { from: t, to: f };
  return { from: f, to: t };
}

export function detectTheaterQuickDateFilter(
  from: string,
  to: string,
  now = new Date(),
): TheaterQuickDateFilter | null {
  if (!from && !to) return "all";
  for (const opt of THEATER_QUICK_DATE_OPTIONS) {
    if (opt.value === "all") continue;
    const r = theaterQuickDateRange(opt.value, now);
    if (r.from === from && r.to === to) return opt.value;
  }
  return null;
}
