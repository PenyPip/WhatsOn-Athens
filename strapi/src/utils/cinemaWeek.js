'use strict';

/** Ημερομηνία (τοπική) στο Europe/Athens. */
function athensLocalDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  return new Date(y, m - 1, d);
}

/** Εβδομάδα κινηματογράφου: Πέμπτη 00:00 → Τετάρτη 23:59 (Europe/Athens). */
function startOfCinemaWeek(d) {
  const x = d instanceof Date ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : athensLocalDate(d);
  const dow = x.getDay();
  const daysSinceThursday = (dow - 4 + 7) % 7;
  x.setDate(x.getDate() - daysSinceThursday);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Άμεση επόμενη εβδομάδα κινηματογράφου (ίδια λογική με frontend). */
function getUpcomingCinemaWeekBounds(now = new Date()) {
  const athensNow = athensLocalDate(now);
  let start = startOfCinemaWeek(athensNow);
  if (athensNow.getTime() >= start.getTime()) {
    start = new Date(start);
    start.setDate(start.getDate() + 7);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Εβδομάδα-στόχος για venue.updated (σινεμά).
 * - Δευ–Τετ: η επόμενη εβδομάδα που ξεκινά Πέμπτη (προετοιμασία προγράμματος).
 * - Πέμ–Κυρ: η τρέχουσα εβδομάδα κινηματογράφου (πρόγραμμα που μόλις άνοιξε).
 */
function getTargetCinemaWeekBoundsForVenueStatus(now = new Date()) {
  const athensNow = athensLocalDate(now);
  const currentStart = startOfCinemaWeek(athensNow);
  const dow = athensNow.getDay();
  let start;
  if (dow >= 1 && dow <= 3) {
    start = new Date(currentStart);
    start.setDate(start.getDate() + 7);
  } else {
    start = new Date(currentStart);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isDatetimeInRange(dt, rangeStart, rangeEnd, now = new Date()) {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return false;
  if (dt.getTime() < now.getTime()) return false;
  const t = dt.getTime();
  return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
}

function parseLocalDay(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split('-').map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfLocalDay(d) {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setHours(23, 59, 59, 999);
  return out;
}

function showtimeWeekRange(st) {
  const kind = st.schedule_kind === 'week_block' ? 'week_block' : 'exact';
  if (kind !== 'week_block') return null;
  const start = parseLocalDay(st.datetime);
  const endDay = parseLocalDay(st.week_end || st.datetime);
  if (!start || !endDay) return null;
  const end = endOfLocalDay(endDay);
  if (end.getTime() < start.getTime()) return null;
  return { start, end };
}

function showtimeOverlapsRange(st, rangeStart, rangeEnd, now = new Date()) {
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

function formatWeekLabel(start, end) {
  const opts = { day: 'numeric', month: 'short' };
  const a = start.toLocaleDateString('el-GR', opts);
  const b = end.toLocaleDateString('el-GR', opts);
  return `${a} – ${b}`;
}

/** Exact datetime μέσα στην εβδομάδα-στόχο για venue.updated. */
function isDatetimeInTargetCinemaWeekForVenueStatus(dt, now = new Date()) {
  const { start, end } = getTargetCinemaWeekBoundsForVenueStatus(now);
  return isDatetimeInRange(dt, start, end, now);
}

/** Exact datetime μέσα στην άμεση επόμενη εβδομάδα κινηματογράφου (μελλοντικές μόνο). */
function isDatetimeInUpcomingCinemaWeek(dt, now = new Date()) {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return false;
  if (dt.getTime() < now.getTime()) return false;
  const { start, end } = getUpcomingCinemaWeekBounds(now);
  const t = dt.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/**
 * complete μόνο Δευτέρα–Παρασκευή (Europe/Athens).
 * Μετά το Σάββατο 06:00 reset, Σάββατο/Κυριακή δεν παίρνουν complete — περιμένουν Δευτέρα.
 */
function isVenueCompleteEligible(now = new Date()) {
  const dow = athensLocalDate(now).getDay();
  return dow >= 1 && dow <= 5;
}

module.exports = {
  athensLocalDate,
  getUpcomingCinemaWeekBounds,
  getTargetCinemaWeekBoundsForVenueStatus,
  showtimeOverlapsRange,
  formatWeekLabel,
  isDatetimeInUpcomingCinemaWeek,
  isDatetimeInTargetCinemaWeekForVenueStatus,
  isVenueCompleteEligible,
};
