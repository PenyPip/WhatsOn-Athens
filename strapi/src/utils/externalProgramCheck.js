'use strict';

const { getUpcomingCinemaWeekBounds, formatWeekLabel } = require('./cinemaWeek');

const FETCH_TIMEOUT_MS = 18_000;
const USER_AGENT = 'whatson-program-check/1.0 (+https://the37n.gr)';

function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function eachDayInRange(start, end) {
  const days = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function patternsForDay(day) {
  const d = day.getDate();
  const m = day.getMonth() + 1;
  const y = day.getFullYear();
  const elShort = day
    .toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
    .replace(/\./g, '')
    .toLowerCase();
  const elLong = day.toLocaleDateString('el-GR', { day: 'numeric', month: 'long' }).toLowerCase();
  const monthShort = day.toLocaleDateString('el-GR', { month: 'short' }).replace(/\./g, '').toLowerCase();

  return [
    elShort,
    elLong,
    `${d} ${monthShort}`,
    `${d}/${m}`,
    `${d}/${String(m).padStart(2, '0')}`,
    `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
    `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`,
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  ].filter(Boolean);
}

/** Ψάχνει στο κείμενο της σελίδας αν αναφέρονται ημέρες της επόμενης εβδομάδας κινηματογράφου. */
function textMentionsUpcomingWeek(text, rangeStart, rangeEnd) {
  const hay = String(text).toLowerCase();
  if (!hay) return { matchedDays: 0 };

  let matchedDays = 0;
  for (const day of eachDayInRange(rangeStart, rangeEnd)) {
    const pats = patternsForDay(day);
    if (pats.some((p) => hay.includes(p))) {
      matchedDays += 1;
    }
  }
  return { matchedDays };
}

async function fetchProgramPageHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (type && !type.includes('text/html') && !type.includes('text/plain') && !type.includes('xml')) {
      throw new Error(`μη HTML (${type})`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @returns {Promise<{ hasProgram: boolean, matchedDays: number, weekLabel: string, url: string, error?: string }>}
 */
async function checkExternalProgramForWeek(programUrl, now = new Date()) {
  const { start, end } = getUpcomingCinemaWeekBounds(now);
  const weekLabel = formatWeekLabel(start, end);

  try {
    const html = await fetchProgramPageHtml(programUrl);
    const text = htmlToText(html);
    const { matchedDays } = textMentionsUpcomingWeek(text, start, end);
    return {
      hasProgram: matchedDays > 0,
      matchedDays,
      weekLabel,
      url: programUrl,
    };
  } catch (err) {
    const message = err?.name === 'AbortError' ? 'timeout' : err?.message || String(err);
    return {
      hasProgram: false,
      matchedDays: 0,
      weekLabel,
      url: programUrl,
      error: message,
    };
  }
}

module.exports = {
  checkExternalProgramForWeek,
  htmlToText,
  textMentionsUpcomingWeek,
};
