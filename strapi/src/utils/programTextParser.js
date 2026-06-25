'use strict';

const { getTargetCinemaWeekBoundsForVenueStatus } = require('./cinemaWeek');

const GREEK_DOW = {
  κυριακη: 0,
  δευτερα: 1,
  τριτη: 2,
  τεταρτη: 3,
  πεμπτη: 4,
  παρασκευη: 5,
  σαββατο: 6,
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

const DAY_NAMES = 'Δευτέρα|Τρίτη|Τετάρτη|Πέμπτη|Παρασκευή|Σάββατο|Κυριακή';

const SHOWTIME_RE = new RegExp(
  `(?:^|[\\s,;·])(${DAY_NAMES})\\s+(\\d{1,2})[.:](\\d{2})\\b`,
  'giu',
);

const DATE_RANGE_RE =
  /(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\s*[–\-—]\s*(?:\S+\s+)?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?/i;

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

/** dd/mm [–] dd/mm — αναζήτηση σε όλο το κείμενο. */
function parseProgramDateRange(text, refYear = new Date().getFullYear()) {
  const hay = String(text || '');
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

function buildAthensDatetime(date, hour, minute) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:00+03:00`);
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

function lineHasShowtime(line) {
  return firstShowtimeMatch(line) != null;
}

function isLikelyHeaderLine(line) {
  const stripped = stripLineDecorators(line);
  if (!stripped) return false;
  const n = normalizeGreek(stripped);
  if (/προγραμμα|κιν\/φου|κινηματογραφ|cinema|program/.test(n)) return true;
  if (DATE_RANGE_RE.test(stripped) && !lineHasShowtime(stripped)) return true;
  return false;
}

function looksLikeTitle(text) {
  const s = String(text || '').trim();
  if (s.length < 2 || s.length > 160) return false;
  if (lineHasShowtime(s)) return false;
  const n = normalizeGreek(s);
  if (/^προγραμμα|^κιν/.test(n)) return false;
  if (DATE_RANGE_RE.test(s) && !lineHasShowtime(s)) return false;
  // καθαρά αριθμητική γραμμή ή μόνο ημερομηνία
  if (/^\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?$/.test(s)) return false;
  return true;
}

/** Χωρίζει γραμμή σε τίτλο + κομμάτι προγράμματος (αν υπάρχουν ώρες στην ίδια γραμμή). */
function splitTitleAndSchedule(line) {
  const stripped = stripLineDecorators(line);
  if (!stripped) return null;

  const showtimeStart = (() => {
    const hit = firstShowtimeMatch(stripped);
    return hit ? hit.dayStart : -1;
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

function parseShowtimesFromText(scheduleText, rangeStart, rangeEnd) {
  const showtimes = [];
  const hay = String(scheduleText || '');
  if (!hay.trim() || !rangeStart || !rangeEnd) return showtimes;

  SHOWTIME_RE.lastIndex = 0;
  let m;
  while ((m = SHOWTIME_RE.exec(hay)) !== null) {
    const dayKey = normalizeGreek(m[1]);
    const dow = GREEK_DOW[dayKey];
    if (dow == null) continue;

    const hour = Number(m[2]);
    const minute = Number(m[3]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) continue;

    const dayDate = dateForDowInRange(dow, rangeStart, rangeEnd);
    if (!dayDate) continue;

    const datetime = buildAthensDatetime(dayDate, hour, minute);
    const note = extractNoteAfterTime(hay, m.index, m[0].length);

    showtimes.push({
      dayLabel: GREEK_DOW_LABEL[dow],
      timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      datetime,
      note,
    });
  }

  return showtimes;
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

    if (looksLikeTitle(stripLineDecorators(line))) {
      pushCurrent();
      current = { title: stripLineDecorators(line), scheduleParts: [] };
    } else if (current) {
      current.scheduleParts.push(line);
    }
  }

  pushCurrent();

  return {
    header: headerLines.join('\n').trim(),
    movies: movies.filter((m) => m.title && m.title !== 'Άγνωστη ταινία' || m.scheduleText),
  };
}

function splitMovieBlocks(text) {
  const emojiSplit = splitMovieBlocksByEmoji(text);
  if (emojiSplit) return emojiSplit;
  return splitMovieBlocksFreeForm(text);
}

/**
 * Ανάλυση ελεύθερου κειμένου προγράμματος σινεμά.
 * Δεν απαιτεί συγκεκριμένη μορφή — αρκούν μέρες, ώρες και (ιδανικά) εύρος ημερομηνιών.
 */
function parseCinemaProgramText(text, { refYear = new Date().getFullYear(), now = new Date() } = {}) {
  const warnings = [];
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  const { header, movies } = splitMovieBlocks(normalized);

  if (!movies.length) {
    warnings.push(
      'Δεν αναγνωρίστηκαν ταινίες. Βεβαιώσου ότι κάθε τίτλος είναι σε ξεχωριστή γραμμή (ή με 🎬) και ακολουθούν μέρες+ώρες (π.χ. «Πέμπτη 17.20»).',
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
    const showtimes = parseShowtimesFromText(movie.scheduleText, dateRange.start, dateRange.end);
    if (!showtimes.length && movie.scheduleText.trim()) {
      warnings.push(`«${movie.title}»: δεν αναγνωρίστηκαν ώρες (μέρα + ώρα, π.χ. Πέμπτη 17.20).`);
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
  splitMovieBlocks,
  buildAthensDatetime,
  GREEK_DOW_LABEL,
};
