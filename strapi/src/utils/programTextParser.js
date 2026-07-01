'use strict';

const { getTargetCinemaWeekBoundsForVenueStatus } = require('./cinemaWeek');
const { buildAthensDatetime, formatAthensWallClock } = require('./athensTime');

const GREEK_DOW = {
  κυριακη: 0,
  κυρ: 0,
  δευτερα: 1,
  δευ: 1,
  τριτη: 2,
  τρι: 2,
  τεταρτη: 3,
  τετ: 3,
  πεμπτη: 4,
  πεμ: 4,
  παρασκευη: 5,
  παρ: 5,
  σαββατο: 6,
  σαβ: 6,
};

const GREEK_DOW_LABEL = {
  0: 'Κυριακή',
  1: 'Δευτέρα',
  2: 'Τρίτη',
  3: 'Τετάρτη',
  4: 'Πέμπτη',
  5: 'Παρασκευή',
  6: 'Σάββατο',
};

const DAY_NAMES =
  'Δευτέρα|Δευ\\.?|Τρίτη|Τρι\\.?|Τετάρτη|Τετ\\.?|Πέμπτη|Πεμ\\.?|Πέμ\\.?|Παρασκευή|Παρ\\.?|Σάββατο|Σαβ\\.?|Κυριακή|Κυρ\\.?';

const SHOWTIME_RE = new RegExp(
  `(?:^|[\\s,;·|])(${DAY_NAMES})\\s+(\\d{1,2})[.:](\\d{2})\\b`,
  'giu',
);

const DATE_SHOWTIME_RE = new RegExp(
  `(?:^|[\\s,;·|])((?:\\d{1,2})[/.](?:\\d{1,2})(?:[/.](?:\\d{2,4}))?)\\s+(\\d{1,2})[.:](\\d{2})\\b`,
  'giu',
);

const DATE_RANGE_RE =
  /(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\s*[–\-—]\s*(?:\S+\s+)?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?/i;

const GREEK_MONTH_NAMES =
  'Ιανουαρίου|Φεβρουαρίου|Μαρτίου|Απριλίου|Μαΐου|Μαίου|Ιουνίου|Ιουλίου|Αυγούστου|Σεπτεμβρίου|Οκτωβρίου|Νοεμβρίου|Δεκεμβρίου';

const GREEK_MONTHS = {
  ιανουαριου: 1,
  ιαν: 1,
  φεβρουαριου: 2,
  φεβ: 2,
  μαρτιου: 3,
  μαρ: 3,
  απριλιου: 4,
  απρ: 4,
  μαιου: 5,
  μαϊου: 5,
  μαι: 5,
  ιουνιου: 6,
  ιουν: 6,
  ιουλιου: 7,
  ιουλ: 7,
  αυγουστου: 8,
  αυγ: 8,
  σεπτεμβριου: 9,
  σεπ: 9,
  οκτωβριου: 10,
  οκτ: 10,
  νοεμβριου: 11,
  νοε: 11,
  δεκεμβριου: 12,
  δεκ: 12,
};

const GREEK_DATE_RANGE_RE = new RegExp(
  `(?:[Α-Ωα-ωάέήίόύώ]+\\s+)?(\\d{1,2})\\s+(${GREEK_MONTH_NAMES})(?:\\s+(\\d{4}))?\\s+(?:έως|εως|ως|–|—|-)(?:\\s+και)?\\s+(?:[Α-Ωα-ωάέήίόύώ]+\\s+)?(\\d{1,2})\\s+(${GREEK_MONTH_NAMES})(?:\\s+(\\d{4}))?`,
  'iu',
);

const DOW_RANGE_STIS_RE = new RegExp(
  `(${DAY_NAMES})\\s+(?:έως|εως|ως|–|—|-)\\s+(${DAY_NAMES})\\s+στις\\s+((?:\\d{1,2}:\\d{2})(?:\\s*(?:&|,|και)\\s*\\d{1,2}:\\d{2})*)`,
  'giu',
);

const DOW_STIS_RE = new RegExp(
  `(?:^|[\\s,;·|])(${DAY_NAMES})\\s+στις\\s+((?:\\d{1,2}:\\d{2})(?:\\s*(?:&|,|και)\\s*\\d{1,2}:\\d{2})*)`,
  'giu',
);

const STIS_TIMES_RE = /(\d{1,2}):(\d{2})/g;

const ORES_PROBOLIS_RE = /ωρες\s+προβολης\s*:\s*(.+)$/iu;

const QUOTED_LINE_RE = /^[«"'].+[»"']$/u;

const TIME_ONLY_LINE_RE = /^(\d{1,2}):(\d{2})$/;

const DAY_DDMM_HEADER_RE = new RegExp(
  `^(?:${DAY_NAMES})\\s+(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\s*$`,
  'iu',
);

function parseGreekDateRangeFromMatch(m, refYear) {
  if (!m) return null;
  const y1 = resolveYear(m[3], refYear);
  const m1 = monthNameToNumber(m[2]);
  const d1 = Number(m[1]);
  const y2 = resolveYear(m[6], y1);
  const m2 = monthNameToNumber(m[5]);
  const d2 = Number(m[4]);
  if (!m1 || !m2 || !d1 || !d2) return null;
  const start = localDate(y1, m1, d1);
  let end = localDate(y2, m2, d2);
  if (!m[6] && end.getTime() < start.getTime()) {
    end.setFullYear(end.getFullYear() + 1);
  }
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function eachCalendarDay(rangeStart, rangeEnd) {
  const out = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(rangeEnd);
  last.setHours(23, 59, 59, 999);
  while (cursor.getTime() <= last.getTime()) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function pushCalendarShowtimes(showtimes, range, times) {
  if (!range || !times.length) return;
  for (const dayDate of eachCalendarDay(range.start, range.end)) {
    for (const { hour, minute } of times) {
      const datetime = buildAthensDatetimeFromLocalDate(dayDate, hour, minute);
      const { dayLabel, timeLabel } = formatAthensWallClock(datetime);
      showtimes.push({ dayLabel, timeLabel, datetime, note: null });
    }
  }
}

/** «Παρασκευή 26 Ιουνίου 2026 έως Κυριακή 28 Ιουνίου 2026» + «Ώρες προβολής: 20:40». */
function parseOreresProbolisSchedule(scheduleText, refYear) {
  const showtimes = [];
  const lines = String(scheduleText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  let pendingRange = null;

  for (const line of lines) {
    const rangeMatch = line.match(GREEK_DATE_RANGE_RE);
    if (rangeMatch) {
      pendingRange = parseGreekDateRangeFromMatch(rangeMatch, refYear);
      const sameLineTimes = normalizeGreek(line).match(ORES_PROBOLIS_RE);
      if (sameLineTimes) {
        pushCalendarShowtimes(showtimes, pendingRange, parseTimesList(sameLineTimes[1]));
        pendingRange = null;
      }
      continue;
    }

    const timesLine = normalizeGreek(line).match(ORES_PROBOLIS_RE);
    if (timesLine && pendingRange) {
      pushCalendarShowtimes(showtimes, pendingRange, parseTimesList(timesLine[1]));
      pendingRange = null;
    }
  }

  return showtimes;
}

function isQuotedSubtitleLine(line) {
  const s = String(line || '').trim();
  return QUOTED_LINE_RE.test(s);
}

/** Περίληψη πλοκής (όχι τίτλος) — συχνά σε catalog paste με κενές γραμμές ανάμεσα. */
function isSynopsisLine(line) {
  const s = String(line || '').trim();
  if (!s || isScheduleLine(s) || isQuotedSubtitleLine(s)) return false;
  if (s.length >= 100) return true;
  if (/,\s*\d{4}[.·]/.test(s)) return true;
  const n = normalizeGreek(s);
  if (
    s.length >= 50 &&
    /\b(ειναι|ηταν|ζει|γινεται|αλλαζει|θαβει|γνωριζει|μπαινει|βγαινει|ζουν|παιζει)\b/.test(n)
  ) {
    return true;
  }
  if ((s.match(/[.!?]/g) || []).length >= 2 && s.length >= 60) return true;
  return false;
}

function isLikelyMovieTitleLine(line) {
  const s = stripLineDecorators(line);
  if (!s || isScheduleLine(s) || isQuotedSubtitleLine(s) || isSynopsisLine(s)) return false;
  return looksLikeTitle(s);
}

function isScheduleLine(line) {
  const s = String(line || '').trim();
  if (!s) return false;
  if (GREEK_DATE_RANGE_RE.test(s)) return true;
  if (ORES_PROBOLIS_RE.test(normalizeGreek(s))) return true;
  return lineHasShowtime(s);
}

function cleanMovieTitle(raw) {
  const s = stripLineDecorators(raw);
  const paren = s.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) return paren[1].trim();
  return s;
}

function parseMovieBlockFromChunk(chunk) {
  const blocks = parseMovieBlocksFromChunk(chunk);
  return blocks[0] ?? null;
}

/** Ένα ή περισσότερα blocks ανά παράγραφο (τίτλος + σύνοψη + ημερομηνίες + ώρες). */
function parseMovieBlocksFromChunk(chunk) {
  const lines = String(chunk || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const movies = [];
  let current = null;

  const flush = () => {
    if (!current?.title) return;
    movies.push({
      title: current.title,
      scheduleText: current.scheduleLines.join('\n').trim(),
    });
    current = null;
  };

  for (const line of lines) {
    if (isQuotedSubtitleLine(line) || isSynopsisLine(line)) continue;

    if (isLikelyMovieTitleLine(line)) {
      const title = cleanMovieTitle(line);
      const key = normalizeGreek(title);
      if (current?.title && normalizeGreek(current.title) === key) continue;
      flush();
      current = { title, scheduleLines: [] };
      continue;
    }

    if (isScheduleLine(line)) {
      if (!current) current = { title: null, scheduleLines: [] };
      current.scheduleLines.push(line);
    }
  }

  flush();
  return movies.filter((m) => m.title);
}

/** Ενώνει παράγραφους-ορφανά (σύνοψη, ημερομηνίες) με την προηγούμενη ταινία. */
function mergeParagraphChunks(chunks) {
  const merged = [];
  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    const first = lines[0];
    if (!merged.length) {
      merged.push(chunk);
      continue;
    }
    if (
      !first ||
      isScheduleLine(first) ||
      isSynopsisLine(first) ||
      isQuotedSubtitleLine(first) ||
      (!isLikelyMovieTitleLine(first) && !looksLikeTitle(stripLineDecorators(first)))
    ) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}\n\n${chunk}`;
      continue;
    }
    merged.push(chunk);
  }
  return merged;
}

const LEADING_DECOR_RE = /^[\s🎬🎥📽️▪️•\-–—*»«"']+/u;
const LEADING_ENUM_RE = /^\d+[.)]\s*/u;

function normalizeGreek(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function resolveYear(token, refYear) {
  if (!token) return refYear;
  const n = Number(token);
  if (!Number.isFinite(n)) return refYear;
  return n < 100 ? 2000 + n : n;
}

function localDate(year, month, day) {
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthNameToNumber(raw) {
  const n = normalizeGreek(raw).replace(/\./g, '');
  if (GREEK_MONTHS[n] != null) return GREEK_MONTHS[n];
  const prefix = n.slice(0, 3);
  for (const [key, month] of Object.entries(GREEK_MONTHS)) {
    if (key.startsWith(prefix) || prefix.startsWith(key.slice(0, 3))) return month;
  }
  return null;
}

/** dd/mm ή «25 Ιουνίου έως 1 Ιουλίου» (ανά γραμμή — όχι σε όλο το κείμενο). */
function parseProgramDateRange(text, refYear = new Date().getFullYear()) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const greek = line.match(GREEK_DATE_RANGE_RE);
    if (greek) {
      const y1 = resolveYear(greek[3], refYear);
      const m1 = monthNameToNumber(greek[2]);
      const d1 = Number(greek[1]);
      const y2 = resolveYear(greek[6], y1);
      const m2 = monthNameToNumber(greek[5]);
      const d2 = Number(greek[4]);
      if (m1 && m2 && d1 && d2) {
        const start = localDate(y1, m1, d1);
        let end = localDate(y2, m2, d2);
        if (!greek[6] && end.getTime() < start.getTime()) {
          end.setFullYear(end.getFullYear() + 1);
        }
        end.setHours(23, 59, 59, 999);
        return { start, end, inferred: false };
      }
    }

    const m = line.match(DATE_RANGE_RE);
    if (m) {
      const y1 = resolveYear(m[3], refYear);
      const start = localDate(y1, Number(m[2]), Number(m[1]));
      const y2 = resolveYear(m[6], y1);
      const end = localDate(y2, Number(m[5]), Number(m[4]));
      if (!m[6] && end.getTime() < start.getTime()) {
        end.setFullYear(end.getFullYear() + 1);
      }
      end.setHours(23, 59, 59, 999);
      return { start, end, inferred: false };
    }
  }

  const hay = lines.join('\n');
  const m = hay.match(DATE_RANGE_RE);
  if (!m) return null;

  const y1 = resolveYear(m[3], refYear);
  const start = localDate(y1, Number(m[2]), Number(m[1]));
  let y2 = resolveYear(m[6], y1);
  const end = localDate(y2, Number(m[5]), Number(m[4]));
  if (!m[6] && end.getTime() < start.getTime()) {
    end.setFullYear(end.getFullYear() + 1);
  }
  end.setHours(23, 59, 59, 999);
  return { start, end, inferred: false };
}

function inferDateRangeFromCinemaWeek(now = new Date()) {
  const { start, end } = getTargetCinemaWeekBoundsForVenueStatus(now);
  return { start, end, inferred: true };
}

function dateForDowInRange(dow, rangeStart, rangeEnd) {
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(rangeEnd);
  last.setHours(23, 59, 59, 999);
  while (cursor.getTime() <= last.getTime()) {
    if (cursor.getDay() === dow) return new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function buildAthensDatetimeFromLocalDate(date, hour, minute) {
  return buildAthensDatetime(date, hour, minute);
}

function stripLineDecorators(line) {
  return String(line || '')
    .replace(LEADING_DECOR_RE, '')
    .replace(LEADING_ENUM_RE, '')
    .trim();
}

function firstShowtimeMatch(line) {
  const hay = String(line || '');
  SHOWTIME_RE.lastIndex = 0;
  const m = SHOWTIME_RE.exec(hay);
  if (!m) return null;
  const dayStart = hay.indexOf(m[1], Math.max(0, m.index));
  return { match: m, dayStart: dayStart >= 0 ? dayStart : m.index };
}

function dayNameToDow(raw) {
  const n = normalizeGreek(raw).replace(/\./g, '');
  if (GREEK_DOW[n] != null) return GREEK_DOW[n];
  const prefix = n.slice(0, 3);
  for (const [key, dow] of Object.entries(GREEK_DOW)) {
    if (key.startsWith(prefix) || prefix.startsWith(key.slice(0, 3))) return dow;
  }
  return null;
}

function parseTimesList(raw) {
  const times = [];
  const hay = String(raw || '');
  STIS_TIMES_RE.lastIndex = 0;
  let m;
  while ((m = STIS_TIMES_RE.exec(hay)) !== null) {
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour <= 23 && minute <= 59) times.push({ hour, minute });
  }
  return times;
}

function dowsInInclusiveRange(startDow, endDow) {
  const days = [];
  let d = startDow;
  for (let guard = 0; guard < 7; guard += 1) {
    days.push(d);
    if (d === endDow) break;
    d = (d + 1) % 7;
  }
  return days;
}

function datesForDowsInRange(dows, rangeStart, rangeEnd) {
  const out = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(rangeEnd);
  last.setHours(23, 59, 59, 999);
  const wanted = new Set(dows);
  while (cursor.getTime() <= last.getTime()) {
    if (wanted.has(cursor.getDay())) out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function firstDowRangeStisMatch(line) {
  const hay = String(line || '');
  DOW_RANGE_STIS_RE.lastIndex = 0;
  const m = DOW_RANGE_STIS_RE.exec(hay);
  if (!m) return null;
  const start = hay.indexOf(m[0], Math.max(0, m.index));
  return { match: m, start: start >= 0 ? start : m.index };
}

function firstDowStisMatch(line) {
  const hay = String(line || '');
  DOW_STIS_RE.lastIndex = 0;
  const m = DOW_STIS_RE.exec(hay);
  if (!m) return null;
  const start = hay.indexOf(m[1], Math.max(0, m.index));
  return { match: m, start: start >= 0 ? start : m.index };
}

function lineHasShowtime(line) {
  return (
    firstShowtimeMatch(line) != null ||
    firstDateShowtimeMatch(line) != null ||
    firstDowRangeStisMatch(line) != null ||
    firstDowStisMatch(line) != null
  );
}

function isLikelyHeaderLine(line) {
  const stripped = stripLineDecorators(line);
  if (!stripped) return false;
  const n = normalizeGreek(stripped);
  if (/προγραμμα|κιν\/φου|κινηματογραφ|cinema|program/.test(n)) return true;
  if (GREEK_DATE_RANGE_RE.test(stripped) && !firstDowRangeStisMatch(stripped) && !firstDowStisMatch(stripped)) {
    return true;
  }
  if (DATE_RANGE_RE.test(stripped) && !lineHasShowtime(stripped)) return true;
  return false;
}

function firstDateShowtimeMatch(line) {
  const hay = String(line || '');
  DATE_SHOWTIME_RE.lastIndex = 0;
  const m = DATE_SHOWTIME_RE.exec(hay);
  if (!m) return null;
  const start = hay.indexOf(m[1], Math.max(0, m.index));
  return { match: m, start: start >= 0 ? start : m.index };
}

function looksLikeTitle(text) {
  const s = String(text || '').trim();
  if (isSynopsisLine(s)) return false;
  if (s.length < 2 || s.length > 160) return false;
  if (DAY_DDMM_HEADER_RE.test(s)) return false;
  if (TIME_ONLY_LINE_RE.test(s)) return false;
  if (lineHasShowtime(s)) return false;
  const n = normalizeGreek(s);
  if (/^προγραμμα|^κιν|^ωρες|^προβολ/.test(n)) return false;
  if (DATE_RANGE_RE.test(s) && !lineHasShowtime(s)) return false;
  if (/^\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?$/.test(s)) return false;
  const letters = s.replace(/[^a-zA-ZΑ-Ωα-ωάέήίόύώΰϊϋ]/gu, '');
  if (letters.length >= 3) {
    const upper = letters.replace(/[^A-ZΑ-ΩΆΈΉΊΌΎΏΪΫ]/gu, '');
    if (upper.length / letters.length >= 0.75) return true;
  }
  return true;
}

/** Χωρίζει γραμμή σε τίτλο + κομμάτι προγράμματος (αν υπάρχουν ώρες στην ίδια γραμμή). */
function splitTitleAndSchedule(line) {
  const stripped = stripLineDecorators(line);
  if (!stripped) return null;

  const dashSplit = stripped.match(/^(.+?)\s*[—–\-|:]\s*(.+)$/u);
  if (dashSplit && lineHasShowtime(dashSplit[2])) {
    const title = dashSplit[1].replace(/[\s\-–—:|*]+$/, '').trim();
    if (title.length >= 2) {
      return { title, schedulePart: dashSplit[2].trim() };
    }
  }

  const rangeStis = firstDowRangeStisMatch(stripped) || firstDowStisMatch(stripped);
  if (rangeStis && rangeStis.start > 0) {
    const title = stripped
      .slice(0, rangeStis.start)
      .replace(/[\s\-–—:|]+$/, '')
      .trim();
    const schedulePart = stripped.slice(rangeStis.start).trim();
    if (title.length >= 2 && schedulePart) {
      return { title, schedulePart };
    }
  }

  const showtimeStart = (() => {
    const hit =
      firstShowtimeMatch(stripped) ||
      firstDateShowtimeMatch(stripped) ||
      firstDowRangeStisMatch(stripped) ||
      firstDowStisMatch(stripped);
    return hit ? hit.dayStart ?? hit.start : -1;
  })();

  if (showtimeStart >= 0) {
    const title = stripped
      .slice(0, showtimeStart)
      .replace(/[\s\-–—:|]+$/, '')
      .trim();
    const schedulePart = stripped.slice(showtimeStart).trim();
    if (title.length >= 2) {
      return { title, schedulePart };
    }
    if (schedulePart) {
      return { title: null, schedulePart };
    }
  }

  if (looksLikeTitle(stripped)) {
    return { title: stripped, schedulePart: '' };
  }

  if (lineHasShowtime(stripped)) {
    return { title: null, schedulePart: stripped };
  }

  return null;
}

function extractNoteAfterTime(scheduleText, matchIndex, matchLength) {
  const tail = scheduleText.slice(matchIndex + matchLength);
  const comma = tail.indexOf(',');
  const nextDay = tail.search(
    new RegExp(`(?:^|[\\s,;·])(?:${DAY_NAMES})\\s+\\d{1,2}[.:]\\d{2}\\b`, 'iu'),
  );
  const end =
    nextDay >= 0
      ? Math.min(comma >= 0 ? comma : tail.length, nextDay)
      : comma >= 0
        ? comma
        : tail.length;
  const note = tail.slice(0, end).trim().replace(/^[,·;\s]+/, '');
  return note || null;
}

function parseDateShowtimesFromText(scheduleText, refYear) {
  const showtimes = [];
  const hay = String(scheduleText || '');
  if (!hay.trim()) return showtimes;

  DATE_SHOWTIME_RE.lastIndex = 0;
  let m;
  while ((m = DATE_SHOWTIME_RE.exec(hay)) !== null) {
    const dateParts = m[1].split(/[/.]/);
    const day = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const year = resolveYear(dateParts[2], refYear);
    const hour = Number(m[2]);
    const minute = Number(m[3]);
    if (!day || !month || hour > 23 || minute > 59) continue;

    const dayDate = localDate(year, month, day);
    const datetime = buildAthensDatetimeFromLocalDate(dayDate, hour, minute);
    const { dayLabel, timeLabel } = formatAthensWallClock(datetime);
    const note = extractNoteAfterTime(hay, m.index, m[0].length);

    showtimes.push({ dayLabel, timeLabel, datetime, note });
  }

  return showtimes;
}

function isSummerScreeningLabel(text) {
  const hay = normalizeGreek(String(text || ''));
  if (!hay) return false;
  return /θεριν[οόςη]|therino|\bsummer\b/i.test(hay);
}

function dedupeShowtimes(showtimes) {
  const byKey = new Map();
  for (const st of showtimes) {
    const key = st.datetime.toISOString();
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, st);
      continue;
    }
    if (st.summer_screening && !prev.summer_screening) {
      byKey.set(key, { ...prev, summer_screening: true });
    }
  }
  return [...byKey.values()].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

function parseDowRangeStisShowtimes(scheduleText, rangeStart, rangeEnd) {
  const showtimes = [];
  const hay = String(scheduleText || '');
  if (!hay.trim() || !rangeStart || !rangeEnd) return showtimes;

  const covered = [];

  DOW_RANGE_STIS_RE.lastIndex = 0;
  let m;
  while ((m = DOW_RANGE_STIS_RE.exec(hay)) !== null) {
    covered.push([m.index, m.index + m[0].length]);
    const startDow = dayNameToDow(m[1]);
    const endDow = dayNameToDow(m[2]);
    if (startDow == null || endDow == null) continue;

    const times = parseTimesList(m[3]);
    if (!times.length) continue;

    const dows = dowsInInclusiveRange(startDow, endDow);
    const dates = datesForDowsInRange(dows, rangeStart, rangeEnd);
    for (const dayDate of dates) {
      for (const { hour, minute } of times) {
        const datetime = buildAthensDatetimeFromLocalDate(dayDate, hour, minute);
        const { dayLabel, timeLabel } = formatAthensWallClock(datetime);
        showtimes.push({ dayLabel, timeLabel, datetime, note: null });
      }
    }
  }

  const isCovered = (index) =>
    covered.some(([start, end]) => index >= start && index < end);

  DOW_STIS_RE.lastIndex = 0;
  while ((m = DOW_STIS_RE.exec(hay)) !== null) {
    if (isCovered(m.index)) continue;
    const dow = dayNameToDow(m[1]);
    if (dow == null) continue;
    const times = parseTimesList(m[2]);
    if (!times.length) continue;

    const dayDate = dateForDowInRange(dow, rangeStart, rangeEnd);
    if (!dayDate) continue;

    for (const { hour, minute } of times) {
      const datetime = buildAthensDatetimeFromLocalDate(dayDate, hour, minute);
      const { dayLabel, timeLabel } = formatAthensWallClock(datetime);
      showtimes.push({ dayLabel, timeLabel, datetime, note: null });
    }
  }

  return showtimes;
}

function parseShowtimesFromText(scheduleText, rangeStart, rangeEnd, refYear) {
  const showtimes = [];
  const hay = String(scheduleText || '');
  if (!hay.trim()) return showtimes;

  if (rangeStart && rangeEnd) {
    SHOWTIME_RE.lastIndex = 0;
    let m;
    while ((m = SHOWTIME_RE.exec(hay)) !== null) {
      const dow = dayNameToDow(m[1]);
      if (dow == null) continue;

      const hour = Number(m[2]);
      const minute = Number(m[3]);
      if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) continue;

      const dayDate = dateForDowInRange(dow, rangeStart, rangeEnd);
      if (!dayDate) continue;

      const datetime = buildAthensDatetimeFromLocalDate(dayDate, hour, minute);
      const { dayLabel, timeLabel } = formatAthensWallClock(datetime);
      const note = extractNoteAfterTime(hay, m.index, m[0].length);

      showtimes.push({
        dayLabel,
        timeLabel,
        datetime,
        note,
      });
    }
  }

  return dedupeShowtimes([
    ...showtimes,
    ...parseDowRangeStisShowtimes(hay, rangeStart, rangeEnd),
    ...parseOreresProbolisSchedule(hay, refYear),
    ...parseDateShowtimesFromText(hay, refYear),
  ]);
}

function splitMovieBlocksByEmoji(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized.includes('🎬')) return null;

  const parts = normalized.split(/\n\s*🎬\s*/u);
  const header = (parts[0] || '').trim();
  const movies = [];

  for (let i = 1; i < parts.length; i += 1) {
    const chunk = parts[i].trim();
    if (!chunk) continue;
    const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;

    const first = splitTitleAndSchedule(lines[0]);
    const title = first?.title || stripLineDecorators(lines[0]);
    const scheduleParts = [];
    if (first?.schedulePart) scheduleParts.push(first.schedulePart);
    scheduleParts.push(...lines.slice(1));
    if (!title) continue;

    movies.push({
      title,
      scheduleText: scheduleParts.join(' ').trim(),
    });
  }

  return movies.length ? { header, movies } : null;
}

/** Ελεύθερη μορφή: τίτλοι σε ξεχωριστές γραμμές ή στην ίδια γραμμή με ώρες. */
function splitMovieBlocksFreeForm(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  const rawLines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!rawLines.length) return { header: '', movies: [] };

  const headerLines = [];
  const bodyLines = [];
  let headerDone = false;

  for (const line of rawLines) {
    if (!headerDone && isLikelyHeaderLine(line) && !lineHasShowtime(line)) {
      headerLines.push(line);
      continue;
    }
    headerDone = true;
    bodyLines.push(line);
  }

  if (!bodyLines.length && headerLines.length) {
    bodyLines.push(...headerLines);
    headerLines.length = 0;
  }

  const movies = [];
  let current = null;

  const pushCurrent = () => {
    if (!current?.title) return;
    movies.push({
      title: current.title,
      scheduleText: (current.scheduleParts || []).join(' ').trim(),
    });
    current = null;
  };

  for (const line of bodyLines) {
    const split = splitTitleAndSchedule(line);

    if (split?.title && split.schedulePart) {
      pushCurrent();
      current = { title: split.title, scheduleParts: [split.schedulePart] };
      continue;
    }

    if (split?.title && !split.schedulePart) {
      pushCurrent();
      current = { title: split.title, scheduleParts: [] };
      continue;
    }

    if (split?.schedulePart) {
      if (!current?.title) {
        current = { title: 'Άγνωστη ταινία', scheduleParts: [split.schedulePart] };
      } else {
        current.scheduleParts.push(split.schedulePart);
      }
      continue;
    }

    if (looksLikeTitle(stripLineDecorators(line)) && !isSynopsisLine(line)) {
      pushCurrent();
      current = { title: stripLineDecorators(line), scheduleParts: [] };
    } else if (current) {
      if (!isSynopsisLine(line) && !isQuotedSubtitleLine(line)) {
        current.scheduleParts.push(line);
      }
    }
  }

  pushCurrent();

  return {
    header: headerLines.join('\n').trim(),
    movies: movies.filter((m) => m.title && m.title !== 'Άγνωστη ταινία' || m.scheduleText),
  };
}

function splitMovieBlocksByParagraph(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  const rawChunks = normalized.split(/\n\s*\n+/).map((c) => c.trim()).filter(Boolean);
  if (!rawChunks.length) return null;

  let header = '';
  let startIdx = 0;
  const firstLines = rawChunks[0].split('\n').map((line) => line.trim()).filter(Boolean);
  if (
    rawChunks.length > 1 &&
    firstLines.length === 1 &&
    isLikelyHeaderLine(firstLines[0]) &&
    !lineHasShowtime(firstLines[0])
  ) {
    header = rawChunks[0];
    startIdx = 1;
  }

  const chunks = mergeParagraphChunks(rawChunks.slice(startIdx));
  const movies = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const blocks = parseMovieBlocksFromChunk(chunks[i]);
    for (const block of blocks) {
      if (block?.title) movies.push(block);
    }
  }

  return movies.length ? { header, movies: dedupeMovieBlocks(movies) } : null;
}

/** Συγχώνευση διπλών τίτλων (π.χ. επανάληψη από copy-paste catalog). */
function dedupeMovieBlocks(movies) {
  const map = new Map();
  for (const m of movies) {
    const key = normalizeGreek(m.title);
    if (!map.has(key)) {
      map.set(key, { title: m.title, scheduleText: m.scheduleText || '' });
      continue;
    }
    const prev = map.get(key);
    const scheduleText = [prev.scheduleText, m.scheduleText].filter(Boolean).join('\n');
    map.set(key, { title: prev.title, scheduleText });
  }
  return [...map.values()];
}

function splitMovieBlocks(text) {
  const emojiSplit = splitMovieBlocksByEmoji(text);
  if (emojiSplit) return emojiSplit;
  const paragraphSplit = splitMovieBlocksByParagraph(text);
  if (paragraphSplit) return paragraphSplit;
  return splitMovieBlocksFreeForm(text);
}

function parseDayHeaderDate(match, refYear) {
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = resolveYear(match[3], refYear);
  if (!day || !month) return null;
  return localDate(year, month, day);
}

function parseMovieLineTitle(line) {
  const s = String(line || '').trim();
  if (!s || DAY_DDMM_HEADER_RE.test(s) || TIME_ONLY_LINE_RE.test(s)) return null;

  const paren = s.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  const withoutVenue = paren ? paren[1].trim() : s;
  const venueNote = paren ? paren[2].trim() : null;
  const dashIdx = withoutVenue.indexOf(' - ');
  const title = (dashIdx >= 0 ? withoutVenue.slice(0, dashIdx) : withoutVenue).replace(/\s+/g, ' ').trim();
  if (!title) return null;

  return { title, note: venueNote };
}

function looksLikeDayCentricProgram(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.filter((line) => DAY_DDMM_HEADER_RE.test(line)).length >= 2;
}

/** Μορφή: «Πέμπτη 25/06» → «20:50» → «ΤΑΙΝΙΑ - …» (ανά ημέρα). */
function parseDayCentricCinemaProgram(text, { refYear = new Date().getFullYear(), now = new Date() } = {}) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const movieMap = new Map();
  let currentDate = null;
  let pendingTime = null;

  for (const line of lines) {
    const dayHeader = line.match(DAY_DDMM_HEADER_RE);
    if (dayHeader) {
      currentDate = parseDayHeaderDate(dayHeader, refYear);
      pendingTime = null;
      continue;
    }

    const timeMatch = line.match(TIME_ONLY_LINE_RE);
    if (timeMatch && currentDate) {
      pendingTime = { hour: Number(timeMatch[1]), minute: Number(timeMatch[2]) };
      continue;
    }

    if (!pendingTime || !currentDate) continue;

    const parsed = parseMovieLineTitle(line);
    if (!parsed?.title) continue;

    const datetime = buildAthensDatetimeFromLocalDate(currentDate, pendingTime.hour, pendingTime.minute);
    const { dayLabel, timeLabel } = formatAthensWallClock(datetime);
    if (!movieMap.has(parsed.title)) {
      movieMap.set(parsed.title, { title: parsed.title, scheduleText: '', showtimes: [] });
    }
    movieMap.get(parsed.title).showtimes.push({
      dayLabel,
      timeLabel,
      datetime,
      note: parsed.note,
    });
    pendingTime = null;
  }

  const movies = [...movieMap.values()].map((m) => ({
    title: m.title,
    scheduleText: m.scheduleText,
    showtimes: dedupeShowtimes(m.showtimes),
  }));

  const allTimes = movies.flatMap((m) => m.showtimes.map((s) => s.datetime.getTime()));
  let dateRange;
  if (allTimes.length) {
    const start = new Date(Math.min(...allTimes));
    start.setHours(0, 0, 0, 0);
    const end = new Date(Math.max(...allTimes));
    end.setHours(23, 59, 59, 999);
    dateRange = { start, end, inferred: false };
  } else {
    dateRange = inferDateRangeFromCinemaWeek(now);
  }

  const warnings = movies.length
    ? []
    : ['Δεν αναγνωρίστηκαν προβολές στη μορφή ημέρα / ώρα / ταινία.'];

  return { header: '', dateRange, movies, warnings };
}

const TABLE_GRID_DOW_LETTER_RE = /^[ΤΠΣΚΔ]$/iu;
const TABLE_GRID_DAY_MONTH_RE = /(\d{1,2})\s+([Α-Ωα-ωάέήίόύώ.]{2,12})/giu;

function isTableGridNoiseLine(line) {
  const n = normalizeGreek(line);
  return n === 'προπωλησεις' || n === 'προπωληση';
}

function isTableGridTimesOnlyLine(line) {
  const tokens = String(line || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every((token) => TIME_ONLY_LINE_RE.test(token));
}

function countTableGridDayMonths(line) {
  const hay = String(line || '');
  let count = 0;
  TABLE_GRID_DAY_MONTH_RE.lastIndex = 0;
  let m;
  while ((m = TABLE_GRID_DAY_MONTH_RE.exec(hay)) !== null) {
    if (monthNameToNumber(m[2])) count++;
  }
  return count;
}

function isTableGridScheduleLine(line) {
  return countTableGridDayMonths(line) >= 2 || isTableGridTimesOnlyLine(line);
}

function isTableGridDayMonthLine(line) {
  const m = String(line || '')
    .trim()
    .match(/^(\d{1,2})\s+([Α-Ωα-ωάέήίόύώ.]+)$/iu);
  if (!m) return false;
  return Boolean(monthNameToNumber(m[2]));
}

function isTableGridTitleLine(line) {
  const s = String(line || '').trim();
  if (!s || isTableGridNoiseLine(s)) return false;
  if (isTableGridScheduleLine(s)) return false;
  if (TABLE_GRID_DOW_LETTER_RE.test(s)) return false;
  if (/^\d{1,2}$/.test(s)) return false;
  if (TIME_ONLY_LINE_RE.test(s)) return false;
  if (isTableGridTimesOnlyLine(s)) return false;
  if (isTableGridDayMonthLine(s)) return false;
  if (monthNameToNumber(s)) return false;

  const pipeIdx = s.indexOf('|');
  const left = pipeIdx >= 0 ? s.slice(0, pipeIdx).trim() : s;
  const stripped = stripLineDecorators(left);
  if (looksLikeTitle(stripped)) return true;
  if (/[a-zA-ZΑ-Ωα-ωάέήίόύώ]{3,}/u.test(stripped) && !/\d{1,2}:\d{2}/.test(stripped)) return true;
  return false;
}

function cleanTableGridTitle(line) {
  let s = stripLineDecorators(String(line || '').trim());
  const pipeIdx = s.indexOf('|');
  if (pipeIdx >= 0) s = s.slice(0, pipeIdx).trim();
  return s.replace(/\s+/g, ' ').trim();
}

function splitTableGridBlocks(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks = [];
  let title = null;
  let bodyLines = [];

  const flush = () => {
    if (!title) return;
    blocks.push({ title, bodyLines: [...bodyLines] });
    title = null;
    bodyLines = [];
  };

  for (const line of lines) {
    if (isTableGridNoiseLine(line)) continue;

    if (isTableGridTitleLine(line)) {
      const nextTitle = cleanTableGridTitle(line);
      if (title && normalizeGreek(nextTitle) === normalizeGreek(title)) continue;
      flush();
      title = nextTitle;
      continue;
    }

    if (title) bodyLines.push(line);
  }

  flush();
  return blocks;
}

function extractTableGridDatesAndTimes(bodyLines) {
  const joined = bodyLines.join(' ');
  const dates = [];
  TABLE_GRID_DAY_MONTH_RE.lastIndex = 0;
  let m;
  while ((m = TABLE_GRID_DAY_MONTH_RE.exec(joined)) !== null) {
    const month = monthNameToNumber(m[2]);
    if (!month) continue;
    dates.push({ day: Number(m[1]), month });
  }

  const times = [];
  const timeRe = /\b(\d{1,2}):(\d{2})\b/g;
  while ((m = timeRe.exec(joined)) !== null) {
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour <= 23 && minute <= 59) times.push({ hour, minute });
  }

  return { dates, times };
}

function looksLikeTableGridProgram(text) {
  if (looksLikeCatalogProgram(text) || looksLikeDayCentricProgram(text)) return false;

  const normalized = String(text || '').replace(/\r\n/g, '\n');
  let monthDayCount = 0;
  TABLE_GRID_DAY_MONTH_RE.lastIndex = 0;
  let m;
  while ((m = TABLE_GRID_DAY_MONTH_RE.exec(normalized)) !== null) {
    if (monthNameToNumber(m[2])) monthDayCount++;
  }
  if (monthDayCount < 4) return false;

  const blocks = splitTableGridBlocks(normalized);
  return blocks.some((block) => {
    const { dates, times } = extractTableGridDatesAndTimes(block.bodyLines);
    return dates.length >= 3 && times.length >= 3;
  });
}

/** Μορφή πίνακα (π.χ. Arian): τίτλος → στήλες «01 ΙΟΥΛ» → ώρες «22:40». */
function parseTableGridCinemaProgram(text, { refYear = new Date().getFullYear(), now = new Date() } = {}) {
  const blocks = splitTableGridBlocks(text);
  const movies = [];
  const warnings = [];

  for (const block of blocks) {
    const { dates, times } = extractTableGridDatesAndTimes(block.bodyLines);
    if (!dates.length || !times.length) {
      warnings.push(`«${block.title}»: δεν αναγνωρίστηκαν ημερομηνίες ή ώρες στον πίνακα.`);
      movies.push({ title: block.title, scheduleText: block.bodyLines.join('\n'), showtimes: [] });
      continue;
    }

    const showtimes = [];
    const fallbackTime = times[0];
    for (let i = 0; i < dates.length; i++) {
      const { day, month } = dates[i];
      const time = times[i] || fallbackTime;
      if (!time) continue;
      const dayDate = localDate(refYear, month, day);
      const datetime = buildAthensDatetimeFromLocalDate(dayDate, time.hour, time.minute);
      const { dayLabel, timeLabel } = formatAthensWallClock(datetime);
      showtimes.push({ dayLabel, timeLabel, datetime, note: null });
    }

    movies.push({
      title: block.title,
      scheduleText: block.bodyLines.join('\n'),
      showtimes: dedupeShowtimes(showtimes),
    });
  }

  const allTimes = movies.flatMap((movie) => movie.showtimes.map((st) => st.datetime.getTime()));
  let dateRange;
  if (allTimes.length) {
    const start = new Date(Math.min(...allTimes));
    start.setHours(0, 0, 0, 0);
    const end = new Date(Math.max(...allTimes));
    end.setHours(23, 59, 59, 999);
    dateRange = { start, end, inferred: false };
  } else {
    dateRange = inferDateRangeFromCinemaWeek(now);
  }

  if (!movies.length) {
    warnings.push('Δεν αναγνωρίστηκαν ταινίες στη μορφή πίνακα (τίτλος / ημερομηνίες / ώρες).');
  }

  return { header: '', dateRange, movies, warnings: [...new Set(warnings)] };
}

function isProbolesLine(line) {
  return /^προβολες\s*$/i.test(normalizeGreek(line));
}

function isAnalytikoLine(line) {
  return /^αναλυτικο\s+προγραμμα/i.test(normalizeGreek(line));
}

function isAuditoriumLine(line) {
  return /^αιθουσα\s/i.test(normalizeGreek(line));
}

/** Γραμμή προβολών: «Αίθουσα …» ή «Λαΐς Θερινός Πέμ., …: 23.00». */
function isScreenScheduleLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return false;
  if (isAuditoriumLine(raw)) return true;
  if (isProbolesLine(raw) || isAnalytikoLine(raw)) return false;
  if (!/\d{1,2}[.:]\d{2}/.test(raw)) return false;
  return new RegExp(
    `(?:${DAY_NAMES})\\s*[,\\.]\\s*|(?:${DAY_NAMES})\\s*[-–]\\s*|(?:${DAY_NAMES})[^\\n]{0,48}:\\s*\\d{1,2}[.:]\\d{2}`,
    'iu',
  ).test(raw);
}

function looksLikeCatalogProgram(text) {
  const hay = String(text || '');
  if (!/Προβολές/im.test(hay)) return false;
  const lines = hay.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.some((line) => isScreenScheduleLine(line));
}

function extractAuditoriumSchedule(line) {
  const raw = String(line || '').trim();
  if (!isScreenScheduleLine(raw)) return null;
  const rest = isAuditoriumLine(raw) ? raw.replace(/^Αίθουσα\s+/iu, '') : raw;
  const dayStart = rest.search(new RegExp(`(?:^|\\s)(${DAY_NAMES})`, 'iu'));
  if (dayStart < 0) return null;
  return {
    room: dayStart > 0 ? rest.slice(0, dayStart).trim() : null,
    schedule: rest.slice(dayStart).trim(),
  };
}

function parseDayListFromString(raw) {
  const dows = [];
  const chunks = String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    const range = chunk.match(new RegExp(`^(${DAY_NAMES})\\s*[-–]\\s*(${DAY_NAMES})\\.?\\s*$`, 'iu'));
    if (range) {
      const a = dayNameToDow(range[1]);
      const b = dayNameToDow(range[2]);
      if (a != null && b != null) dows.push(...dowsInInclusiveRange(a, b));
      continue;
    }
    const d = dayNameToDow(chunk.replace(/\.+\s*$/, '').replace(/:.*$/, '').trim());
    if (d != null) dows.push(d);
  }
  return [...new Set(dows)];
}

function parseTimesAndNote(raw) {
  let s = String(raw || '').trim();
  let note = null;
  const paren = s.match(/\(([^)]+)\)\s*$/);
  if (paren) {
    note = paren[1].trim();
    s = s.slice(0, paren.index).trim();
  }
  const meta = s.match(/\b(μεταγλω?ττισμένο|μεταγλ\.?|υποτ\.?|υποτιτλισμένο)\b/giu);
  if (meta) {
    note = note ? `${note}; ${meta.join(', ')}` : meta.join(', ');
    for (const m of meta) s = s.replace(m, '');
    s = s.trim();
  }
  const times = [];
  for (const bit of s.split('/')) {
    const m = bit.trim().match(/(\d{1,2})[.:](\d{2})/);
    if (m) times.push({ hour: Number(m[1]), minute: Number(m[2]) });
  }
  return { times, note };
}

function splitScheduleClauses(schedule) {
  const clauses = [];
  let buf = '';
  const hasTime = (s) => /\d{1,2}[.:]\d{2}/.test(String(s || ''));

  for (const piece of String(schedule || '').split(',')) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    if (buf && hasTime(buf) && new RegExp(`^(?:${DAY_NAMES})`, 'iu').test(trimmed)) {
      clauses.push(buf.trim());
      buf = trimmed;
    } else {
      buf = buf ? `${buf}, ${trimmed}` : trimmed;
    }
  }
  if (buf) clauses.push(buf.trim());
  return clauses;
}

function parseAuditoriumScheduleText(schedule, rangeStart, rangeEnd, { summerScreening = false } = {}) {
  const showtimes = [];
  if (!schedule || !rangeStart || !rangeEnd) return showtimes;

  for (const clause of splitScheduleClauses(schedule)) {
    const colonIdx = clause.indexOf(':');
    let dayPart;
    let timePart;
    if (colonIdx >= 0) {
      dayPart = clause.slice(0, colonIdx);
      timePart = clause.slice(colonIdx + 1);
    } else {
      const timeMatch = clause.match(/(\d{1,2}[.:]\d{2}(?:\s*\/\s*\d{1,2}[.:]\d{2})*[^,]*)/);
      if (!timeMatch) continue;
      timePart = timeMatch[1];
      dayPart = clause.slice(0, clause.length - timeMatch[1].length);
    }

    const dows = parseDayListFromString(dayPart);
    const { times, note } = parseTimesAndNote(timePart);
    if (!dows.length || !times.length) continue;

    for (const dow of dows) {
      const dayDate = dateForDowInRange(dow, rangeStart, rangeEnd);
      if (!dayDate) continue;
      for (const { hour, minute } of times) {
        const datetime = buildAthensDatetimeFromLocalDate(dayDate, hour, minute);
        const { dayLabel, timeLabel } = formatAthensWallClock(datetime);
        showtimes.push({
          dayLabel,
          timeLabel,
          datetime,
          note,
          summer_screening: summerScreening === true,
        });
      }
    }
  }

  return showtimes;
}

function parseCatalogMoviesFromLines(lines) {
  const movies = [];
  let i = 0;
  const list = lines.map((line) => line.trim());

  while (i < list.length) {
    while (i < list.length && (!list[i] || isAnalytikoLine(list[i]) || isScreenScheduleLine(list[i]))) i += 1;
    if (i >= list.length) break;

    const title = cleanMovieTitle(list[i]);
    i += 1;

    while (i < list.length && !isProbolesLine(list[i]) && !isAnalytikoLine(list[i])) i += 1;
    if (i >= list.length || isAnalytikoLine(list[i])) continue;
    i += 1;

    const auditoriumLines = [];
    while (i < list.length) {
      if (!list[i]) {
        i += 1;
        continue;
      }
      if (!isScreenScheduleLine(list[i])) break;
      auditoriumLines.push(list[i]);
      i += 1;
    }

    if (title && auditoriumLines.length) {
      movies.push({ title, auditoriumLines });
    }
  }

  return movies;
}
function parseCatalogCinemaProgram(text, { refYear = new Date().getFullYear(), now = new Date() } = {}) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');

  let dateRange = parseProgramDateRange(text, refYear);
  const warnings = [];
  if (!dateRange) {
    dateRange = inferDateRangeFromCinemaWeek(now);
    warnings.push(
      'Δεν βρέθηκε ρητό εύρος ημερομηνιών — χρησιμοποιείται η τρέχουσα/επόμενη εβδομάδα κινηματογράφου.',
    );
  }
  warnings.push('Οι αίθουσες αγνοήθηκαν — οι προβολές μπαίνουν στον επιλεγμένο κινηματογράφο.');
  warnings.push('Γραμμές με «Θερινός» σημειώνονται ως θερινή προβολή — οι υπόλοιπες όχι.');

  const blocks = parseCatalogMoviesFromLines(lines);
  const movies = blocks.map((block) => {
    const showtimes = [];
    for (const line of block.auditoriumLines) {
      const extracted = extractAuditoriumSchedule(line);
      if (!extracted?.schedule) continue;
      const summerScreening =
        isSummerScreeningLabel(extracted.room) || isSummerScreeningLabel(line);
      showtimes.push(
        ...parseAuditoriumScheduleText(extracted.schedule, dateRange.start, dateRange.end, {
          summerScreening,
        }),
      );
    }
    return {
      title: block.title,
      scheduleText: block.auditoriumLines.join('\n'),
      showtimes: dedupeShowtimes(showtimes),
    };
  });

  const parsedMovies = movies.map((movie) => {
    if (!movie.showtimes.length && movie.scheduleText.trim()) {
      warnings.push(`«${movie.title}»: δεν αναγνωρίστηκαν ώρες στις γραμμές αιθουσών.`);
    }
    return movie;
  });

  const withShowtimes = parsedMovies.filter((m) => m.showtimes.length > 0);
  if (parsedMovies.length && !withShowtimes.length) {
    warnings.push('Βρέθηκαν ταινίες αλλά καμία προβολή — έλεγξε τις γραμμές «Αίθουσα …».');
  }

  return {
    header: '',
    dateRange,
    movies: parsedMovies,
    warnings: [...new Set(warnings)],
  };
}

/**
 * Ανάλυση ελεύθερου κειμένου προγράμματος σινεμά.
 * Δεν απαιτεί συγκεκριμένη μορφή — αρκούν μέρες, ώρες και (ιδανικά) εύρος ημερομηνιών.
 */
function parseCinemaProgramText(text, { refYear = new Date().getFullYear(), now = new Date() } = {}) {
  const warnings = [];
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();

  if (looksLikeCatalogProgram(normalized)) {
    return parseCatalogCinemaProgram(normalized, { refYear, now });
  }

  if (looksLikeDayCentricProgram(normalized)) {
    return parseDayCentricCinemaProgram(normalized, { refYear, now });
  }

  if (looksLikeTableGridProgram(normalized)) {
    return parseTableGridCinemaProgram(normalized, { refYear, now });
  }

  const { header, movies } = splitMovieBlocks(normalized);

  if (!movies.length) {
    warnings.push(
      'Δεν αναγνωρίστηκαν ταινίες. Κάθε γραμμή: τίτλος + πρόγραμμα (π.χ. «Πέμπτη έως Κυριακή στις 20:50» ή «Πέμπτη 17.20»).',
    );
  }

  let dateRange = parseProgramDateRange(normalized, refYear);
  if (!dateRange) {
    dateRange = inferDateRangeFromCinemaWeek(now);
    warnings.push(
      'Δεν βρέθηκε ρητό εύρος ημερομηνιών (π.χ. 25/6 – 1/7) — χρησιμοποιείται η τρέχουσα/επόμενη εβδομάδα κινηματογράφου.',
    );
  }

  const parsedMovies = movies.map((movie) => {
    const showtimes = parseShowtimesFromText(
      movie.scheduleText,
      dateRange.start,
      dateRange.end,
      refYear,
    );
    if (!showtimes.length && movie.scheduleText.trim()) {
      warnings.push(`«${movie.title}»: δεν αναγνωρίστηκαν ώρες (π.χ. Ώρες προβολής: 20:40 ή Πέμπτη έως Κυριακή στις 20:50).`);
    }
    return {
      title: movie.title,
      scheduleText: movie.scheduleText,
      showtimes,
    };
  });

  const withShowtimes = parsedMovies.filter((m) => m.showtimes.length > 0);
  if (movies.length && !withShowtimes.length) {
    warnings.push('Βρέθηκαν τίτλοι αλλά καμία προβολή — έλεγξε τις μέρες και τις ώρες.');
  }

  return {
    header,
    dateRange,
    movies: parsedMovies,
    warnings: [...new Set(warnings)],
  };
}

module.exports = {
  parseCinemaProgramText,
  parseProgramDateRange,
  parseShowtimesFromText,
  parseDateShowtimesFromText,
  splitMovieBlocks,
  buildAthensDatetime,
  GREEK_DOW_LABEL,
};
