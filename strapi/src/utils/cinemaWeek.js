'use strict';

/** Εβδομάδα κινηματογράφου: Πέμπτη 00:00 → Τετάρτη 23:59 (τοπική ώρα server = Athens στο Docker). */
function startOfCinemaWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const daysSinceThursday = (dow - 4 + 7) % 7;
  x.setDate(x.getDate() - daysSinceThursday);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Άμεση επόμενη εβδομάδα κινηματογράφου (ίδια λογική με frontend). */
function getUpcomingCinemaWeekBounds(now = new Date()) {
  let start = startOfCinemaWeek(now);
  if (now.getTime() >= start.getTime()) {
    start = new Date(start);
    start.setDate(start.getDate() + 7);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
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

module.exports = {
  getUpcomingCinemaWeekBounds,
  showtimeOverlapsRange,
  formatWeekLabel,
};
