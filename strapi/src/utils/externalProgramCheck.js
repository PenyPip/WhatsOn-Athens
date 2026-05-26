'use strict';

const { getUpcomingCinemaWeekBounds, formatWeekLabel } = require('./cinemaWeek');

const FETCH_TIMEOUT_MS = 18_000;
const USER_AGENT = 'whatson-program-check/1.0 (+https://the37n.gr)';
/** Πάνω στην σελίδα (more_link) συνήθως η κάλυψη ημερών — σαρώνουμε πρώτα το «κεφάλι». */
const HEAD_HTML_CHARS = 24_000;

const EL_MONTH = {
  ιαν: 0,
  ιανουαρ: 0,
  φεβ: 1,
  φεβρ: 1,
  μαρ: 2,
  μαρτ: 2,
  απρ: 3,
  απριλ: 3,
  μαι: 4,
  μαϊ: 4,
  μαΐ: 4,
  ιουν: 5,
  ιουλ: 6,
  αυγ: 7,
  σεπ: 8,
  οκτ: 9,
  νοε: 10,
  δεκ: 11,
};

function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Κείμενο από title, meta και αρχή body (όπου εμφανίζονται οι μέρες κάλυψης). */
function extractPageHeadText(html) {
  const raw = String(html);
  const title = (raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const meta =
    (raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || [])[1] ||
    (raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || [])[1] ||
    '';
  const h1h2 = [...raw.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
    .slice(0, 6)
    .map((m) => m[1])
    .join(' ');
  const bodyChunk = (raw.match(/<body[^>]*>([\s\S]{0,20000})/i) || [])[1] || raw.slice(0, HEAD_HTML_CHARS);
  return htmlToText(`${title} ${meta} ${h1h2} ${bodyChunk}`);
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

function normalizeMonthToken(token) {
  return String(token)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, '')
    .trim();
}

function resolveMonthIndex(token) {
  const key = normalizeMonthToken(token).slice(0, 6);
  if (Object.prototype.hasOwnProperty.call(EL_MONTH, key)) return EL_MONTH[key];
  for (const [abbr, idx] of Object.entries(EL_MONTH)) {
    if (key.startsWith(abbr) || abbr.startsWith(key.slice(0, 4))) return idx;
  }
  return null;
}

function parseGreekDayMonth(dayNum, monthToken, refYear) {
  const month = resolveMonthIndex(monthToken);
  if (month == null || !dayNum) return null;
  let y = refYear;
  const candidate = new Date(y, month, dayNum);
  return candidate;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const as = aStart.getTime();
  const ae = aEnd.getTime();
  const bs = bStart.getTime();
  const be = bEnd.getTime();
  return as <= be && ae >= bs;
}

/** «28 Μαΐ – 3 Ιουν» κ.λπ. — αν τέμνει την επόμενη εβδομάδα κινηματογράφου (Πέμ–Τετ). */
function textHasDateRangeOverlap(text, weekStart, weekEnd, refYear) {
  const hay = String(text);
  const re =
    /(\d{1,2})\s*[/.\-]?\s*([α-ωΑ-ΩάέήίόύώΆΈΉΊΌΎΏ.]{2,14})\s*[–\-—]\s*(\d{1,2})\s*[/.\-]?\s*([α-ωΑ-ΩάέήίόύώΆΈΉΊΌΎΏ.]{2,14})/gi;
  let m;
  while ((m = re.exec(hay)) !== null) {
    const d1 = parseGreekDayMonth(Number(m[1]), m[2], refYear);
    const d2 = parseGreekDayMonth(Number(m[3]), m[4], refYear);
    if (!d1 || !d2) continue;
    const start = d1.getTime() <= d2.getTime() ? d1 : d2;
    const end = d1.getTime() <= d2.getTime() ? d2 : d1;
    end.setHours(23, 59, 59, 999);
    if (rangesOverlap(start, end, weekStart, weekEnd)) return true;
  }
  return false;
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
  const weekday = day.toLocaleDateString('el-GR', { weekday: 'long' }).toLowerCase();

  return [
    elShort,
    elLong,
    weekday,
    `${d} ${monthShort}`,
    `${d}/${m}`,
    `${d}/${String(m).padStart(2, '0')}`,
    `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
    `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`,
    `${d}.${String(m).padStart(2, '0')}`,
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  ].filter(Boolean);
}

/**
 * Τουλάχιστον μία ημέρα της επόμενης εβδομάδας (Πέμ–Τετ) στο κείμενο.
 * @returns {{ matchedDays: number, fromRange: boolean }}
 */
function textMentionsUpcomingWeek(text, rangeStart, rangeEnd) {
  const hay = String(text).toLowerCase();
  if (!hay) return { matchedDays: 0, fromRange: false };

  const refYear = rangeStart.getFullYear();
  if (textHasDateRangeOverlap(text, rangeStart, rangeEnd, refYear)) {
    return { matchedDays: 1, fromRange: true };
  }

  let matchedDays = 0;
  for (const day of eachDayInRange(rangeStart, rangeEnd)) {
    const pats = patternsForDay(day);
    if (pats.some((p) => hay.includes(p.toLowerCase()))) {
      matchedDays += 1;
    }
  }
  return { matchedDays, fromRange: false };
}

function scanTextForUpcomingWeek(text, rangeStart, rangeEnd) {
  return textMentionsUpcomingWeek(text, rangeStart, rangeEnd);
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
    const headText = extractPageHeadText(html);
    const fullText = htmlToText(html);

    const head = scanTextForUpcomingWeek(headText, start, end);
    const full = scanTextForUpcomingWeek(fullText, start, end);
    const matchedDays = Math.max(head.matchedDays, full.matchedDays);

    return {
      hasProgram: matchedDays > 0,
      matchedDays,
      weekLabel,
      url: programUrl,
      scannedHead: head.matchedDays > 0 || head.fromRange,
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
  extractPageHeadText,
  textMentionsUpcomingWeek,
  textHasDateRangeOverlap,
};
