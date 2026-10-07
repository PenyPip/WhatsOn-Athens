'use strict';

const { normalizeHallName, isSummerScreeningLabel } = require('./programTextParser');
const { buildAthensDatetime, formatAthensWallClock } = require('./athensTime');

const FETCH_TIMEOUT_MS = Number(process.env.ATHINORAMA_FETCH_TIMEOUT_MS || 45_000);
const USER_AGENT =
  process.env.ATHINORAMA_USER_AGENT ||
  'Mozilla/5.0 (compatible; WhatsOnProgramImport/1.0; +https://the37n.gr)';

function normalizeThessalonikiGuideCinemaUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, '')}`;
  }
  let url;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  if (host !== 'thessalonikiguide.gr') return null;
  if (!/^\/cinemas\/[^/]+\/?$/i.test(url.pathname)) return null;
  url.protocol = 'https:';
  url.hostname = 'www.thessalonikiguide.gr';
  url.hash = '';
  url.search = '';
  if (url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

function decodeEntities(raw) {
  return String(raw || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#8211;|&#x2013;/gi, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function cellLines(tdHtml) {
  const withBreaks = String(tdHtml || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n');
  return decodeEntities(withBreaks.replace(/<[^>]+>/g, ' '))
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function rowCells(rowHtml) {
  return [...String(rowHtml || '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
}

function splitHallLabel(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const wrapped = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/u);
  if (!wrapped) return { hall: text, note: null };
  const inner = wrapped[2].trim();
  if (/μεταγλ|υποτ/i.test(inner)) return { hall: wrapped[1].trim(), note: inner };
  return { hall: text, note: null };
}

function mergeNotes(...parts) {
  const out = [];
  for (const part of parts) {
    const text = String(part || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (out.some((item) => item.toLocaleLowerCase('el') === text.toLocaleLowerCase('el'))) continue;
    out.push(text);
  }
  return out.length ? out.join(' · ') : null;
}

/**
 * Κεφαλίδα πίνακα → αίθουσα ή σημείωση.
 * «Αίθουσα 2 (Μεταγλ.)», «Αίθουσα 8 (Θερινή)», «Αίθουσα Τορνές | Ταινιοθήκη: …».
 * Ετικέτες σαν «Horror week» ή σκέτο «(Μεταγλ.)» δεν είναι αίθουσα.
 */
function classifyHallHeader(raw) {
  let text = String(raw || '').replace(/\s+/g, ' ').trim();
  let seriesNote = null;
  const pipeIdx = text.indexOf('|');
  if (pipeIdx >= 0) {
    seriesNote = text.slice(pipeIdx + 1).trim() || null;
    text = text.slice(0, pipeIdx).trim();
  }

  let { hall, note } = splitHallLabel(text);
  let summerFromLabel = false;
  const summerWrap = String(hall || '').match(/^(.*?)\s*\(([^)]*θεριν[^)]*)\)\s*$/iu);
  if (summerWrap) {
    hall = summerWrap[1].trim();
    summerFromLabel = true;
  }

  const isHall = /^α[ίι]θουσα(?=\s|$|\()/iu.test(hall);
  if (!hall || !isHall) {
    return {
      hallName: null,
      note: mergeNotes(note, hall && !isHall ? hall : null, seriesNote),
      summerFromLabel,
    };
  }

  return {
    hallName: normalizeHallName(hall),
    note: mergeNotes(note, seriesNote),
    summerFromLabel,
  };
}

function dayToken(label) {
  const m = String(label || '').match(/^(Δε|Τρ|Τε|Πε|Πα|Σα|Κυ)(?=\s|\d|$)/u);
  return m ? m[1] : '';
}

function athensYmd(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date instanceof Date ? date : new Date());
  const num = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { year: num('year'), month: num('month'), day: num('day') };
}

/** «Πε 1/10» → ημερολογιακή μέρα. Χρονιά από το σήμερα· κύλιση αν η μέρα είναι πολύ πίσω ή πολύ μπροστά. */
function guideDateFromLabel(label, now = new Date()) {
  const m = String(label || '').match(/^(Δε|Τρ|Τε|Πε|Πα|Σα|Κυ)\s+(\d{1,2})\/(\d{1,2})/u);
  if (!m) return null;
  const day = Number(m[2]);
  const month = Number(m[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const today = athensYmd(now);
  let year = today.year;
  const diffDays = (Date.UTC(year, month - 1, day) - Date.UTC(today.year, today.month - 1, today.day)) / 86400000;
  if (diffDays < -45) year += 1;
  else if (diffDays > 300) year -= 1;
  return new Date(year, month - 1, day);
}

function clockFromLabel(label) {
  const m = String(label || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function pageIsSummerCinema(html) {
  const h1 = String(html || '').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1) return false;
  const text = decodeEntities(h1[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return isSummerScreeningLabel(text);
}

function showtimeInWeek(datetime, weekBounds) {
  if (!weekBounds?.start || !weekBounds?.end) return true;
  const t = datetime instanceof Date ? datetime.getTime() : new Date(datetime).getTime();
  if (Number.isNaN(t)) return false;
  return t >= new Date(weekBounds.start).getTime() && t <= new Date(weekBounds.end).getTime();
}

function timesFromLines(lines) {
  const times = [];
  for (const line of lines || []) {
    const matches = String(line).match(/\d{1,2}:\d{2}/g) || [];
    times.push(...matches);
  }
  return times;
}

function movieArticles(html) {
  const source = String(html || '');
  const start = source.search(/Ταινίες της [Εε]βδομάδας/);
  const slice = start >= 0 ? source.slice(start) : source;
  return [...slice.matchAll(/<article\b[^>]*itemtype=["']https?:\/\/schema\.org\/Movie["'][^>]*>([\s\S]*?)<\/article>/gi)].map(
    (m) => m[1],
  );
}

function movieTitle(articleHtml) {
  const linked = articleHtml.match(
    /itemprop=["']name["'][^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i,
  );
  const plain = linked || articleHtml.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
  if (!plain) return '';
  return decodeEntities(plain[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function tablesFromArticle(articleHtml) {
  return [...String(articleHtml || '').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((m) => m[1]);
}

function isDayRow(cells) {
  const hits = cells.filter((cell) => dayToken(cellLines(cell).join(' ')));
  return hits.length >= 3;
}

/**
 * HTML κινηματογράφου Thessaloniki Guide → movies με hallName ανά προβολή.
 * Πίνακας multiplex: αίθουσα, ημέρες (Πε 1/10 …), ώρες.
 * Θερινό χωρίς αίθουσα: κενή πρώτη γραμμή ή μόνο ημέρες + ώρες. Το «–» δεν είναι προβολή.
 * Οι ημερομηνίες είναι αυτές που γράφει η σελίδα (και το «Προσεχώς»).
 */
function moviesFromThessalonikiGuideHtml(html, { weekBounds = null, now = new Date() } = {}) {
  const pageSummer = pageIsSummerCinema(html);
  const movies = [];
  let scheduleLines = 0;

  for (const article of movieArticles(html)) {
    const title = movieTitle(article);
    if (!title) continue;
    const showtimes = [];
    const scheduleTextLines = [];

    for (const table of tablesFromArticle(article)) {
      const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
      if (rows.length < 2) continue;
      const dayRowIndex = rows.findIndex((row) => isDayRow(rowCells(row)));
      if (dayRowIndex < 0 || dayRowIndex + 1 >= rows.length) continue;

      const hallRaw = dayRowIndex > 0 ? cellLines(rowCells(rows[dayRowIndex - 1])[0] || []).join(' ') : '';
      const classified = classifyHallHeader(hallRaw);
      const note = classified.note;
      const hallName = classified.hallName;
      const summerScreening =
        pageSummer || classified.summerFromLabel || isSummerScreeningLabel(hallName) || isSummerScreeningLabel(note);
      const dayCells = rowCells(rows[dayRowIndex]);
      const timeCells = rowCells(rows[dayRowIndex + 1]).map((cell) => timesFromLines(cellLines(cell)));
      const width = Math.min(dayCells.length, timeCells.length);

      for (let i = 0; i < width; i += 1) {
        const dayLabel = cellLines(dayCells[i]).join(' ');
        const times = timeCells[i];
        const date = guideDateFromLabel(dayLabel, now);
        if (!dayToken(dayLabel) || !date || !times.length) continue;
        scheduleLines += 1;
        const clocks = times.map(clockFromLabel).filter(Boolean);
        if (!clocks.length) continue;
        const printed = `${dayToken(dayLabel)} ${date.getDate()}/${date.getMonth() + 1}`;
        const schedule = note
          ? `${printed}: ${clocks.map((c) => `${c.hour}:${String(c.minute).padStart(2, '0')}`).join(' / ')} (${note})`
          : `${printed}: ${clocks.map((c) => `${c.hour}:${String(c.minute).padStart(2, '0')}`).join(' / ')}`;
        const roomLabel = hallName || (summerScreening ? 'Θερινό' : '');
        scheduleTextLines.push(roomLabel ? `${roomLabel} ${schedule}` : schedule);

        for (const clock of clocks) {
          const datetime = buildAthensDatetime(date, clock.hour, clock.minute);
          if (!(datetime instanceof Date) || Number.isNaN(datetime.getTime())) continue;
          const wall = formatAthensWallClock(datetime);
          showtimes.push({
            dayLabel: wall.dayLabel,
            timeLabel: wall.timeLabel,
            datetime,
            note: note || null,
            summer_screening: summerScreening === true,
            ...(hallName ? { hallName } : {}),
          });
        }
      }
    }

    const byKey = new Map();
    for (const st of showtimes) {
      const key = `${st.datetime.toISOString()}|${st.hallName || ''}|${st.note || ''}`;
      if (!byKey.has(key)) byKey.set(key, st);
    }
    const unique = [...byKey.values()].sort((a, b) => a.datetime - b.datetime);
    if (!unique.length) continue;
    movies.push({
      title,
      scheduleText: scheduleTextLines.join('\n'),
      showtimes: unique,
    });
  }

  const warnings = [];
  const hasWeek = Boolean(weekBounds?.start && weekBounds?.end);
  const nowMs = (now instanceof Date ? now : new Date()).getTime();
  const inWeek = (st) => showtimeInWeek(st.datetime, weekBounds);
  const isFuture = (st) => st.datetime.getTime() >= nowMs;
  const anyFutureInWeek =
    hasWeek && movies.some((movie) => movie.showtimes.some((st) => inWeek(st) && isFuture(st)));
  const anyInWeek = hasWeek && movies.some((movie) => movie.showtimes.some((st) => inWeek(st)));
  let picked = movies;
  if (anyFutureInWeek) {
    picked = movies
      .map((movie) => ({
        ...movie,
        showtimes: movie.showtimes.filter((st) => inWeek(st)),
      }))
      .filter((movie) => movie.showtimes.length);
  } else if (hasWeek && movies.some((movie) => movie.showtimes.some(isFuture))) {
    // Η εβδομάδα του πίνακα έχει μόνο παρελθόν (π.χ. Φαργκάνη Τετάρτη). Κράτα και το «Προσεχώς».
    picked = movies
      .map((movie) => ({
        ...movie,
        showtimes: movie.showtimes.filter((st) => inWeek(st) || isFuture(st)),
      }))
      .filter((movie) => movie.showtimes.length);
    warnings.push(
      'Η επιλεγμένη εβδομάδα δεν έχει μελλοντικές προβολές· κρατήθηκε και το «Προσεχώς» της σελίδας.',
    );
  } else if (anyInWeek) {
    picked = movies
      .map((movie) => ({
        ...movie,
        showtimes: movie.showtimes.filter((st) => inWeek(st)),
      }))
      .filter((movie) => movie.showtimes.length);
  } else if (hasWeek && movies.length) {
    warnings.push(
      'Οι προβολές της σελίδας είναι εκτός της επιλεγμένης εβδομάδας· εμφανίζεται το πρόγραμμα όπως είναι στη σελίδα.',
    );
  }

  picked.sort((a, b) => a.title.localeCompare(b.title, 'el'));
  const showtimeCount = picked.reduce((sum, movie) => sum + movie.showtimes.length, 0);
  const anyFuture = picked.some((movie) => movie.showtimes.some(isFuture));
  if (picked.length && !anyFuture) {
    const stamps = picked.flatMap((movie) => movie.showtimes.map((st) => st.datetime.getTime()));
    const from = athensYmd(new Date(Math.min(...stamps)));
    const to = athensYmd(new Date(Math.max(...stamps)));
    const span =
      from.day === to.day && from.month === to.month
        ? `${from.day}/${from.month}`
        : `${from.day}/${from.month}–${to.day}/${to.month}`;
    warnings.push(
      `Διαβάστηκαν ${showtimeCount} προβολές (${span}), αλλά έχουν ήδη παιχτεί. Η σελίδα δεν έχει επόμενο πρόγραμμα.`,
    );
  }
  const textBlocks = picked.map((movie) =>
    [movie.title, 'Προβολές', ...String(movie.scheduleText || '').split('\n').filter(Boolean), ''].join('\n'),
  );

  return {
    movies: picked,
    programText: textBlocks.join('\n').trim(),
    warnings,
    stats: {
      cardCount: picked.length,
      scheduleLines,
      showtimeCount,
      movieCount: picked.length,
    },
  };
}

async function fetchThessalonikiGuideCinemaHtml(url, { timeoutMs } = {}) {
  const normalized = normalizeThessalonikiGuideCinemaUrl(url);
  if (!normalized) {
    return { ok: false, error: 'Άκυρο Thessaloniki Guide URL — περίμενε /cinemas/όνομα' };
  }

  const waitMs =
    Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Number(timeoutMs) : FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), waitMs);
  try {
    const res = await fetch(normalized, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'el,en;q=0.8',
      },
    });
    if (!res.ok) {
      return { ok: false, error: `Thessaloniki Guide HTTP ${res.status}`, url: normalized };
    }
    const html = await res.text();
    if (!html || html.length < 500) {
      return { ok: false, error: 'Κενή/πολύ μικρή απάντηση από Thessaloniki Guide', url: normalized };
    }
    return { ok: true, html, url: normalized };
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'Timeout Thessaloniki Guide' : e?.message || String(e);
    return { ok: false, error: msg, url: normalized };
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeThessalonikiGuideCinemaProgram(url, { weekBounds = null, timeoutMs } = {}) {
  const fetched = await fetchThessalonikiGuideCinemaHtml(url, { timeoutMs });
  if (!fetched.ok) return fetched;

  const parsed = moviesFromThessalonikiGuideHtml(fetched.html, { weekBounds });
  const movies = parsed.movies.filter((m) => (m.showtimes || []).length > 0);
  const warnings = [...(parsed.warnings || [])];
  if (movies.length) {
    warnings.push(
      `Thessaloniki Guide: ${parsed.stats.scheduleLines} γραμμές → ${parsed.stats.showtimeCount} προβολές σε ${movies.length} ταινίες.`,
    );
  } else {
    warnings.push('Δεν βρέθηκε εβδομαδιαίο πρόγραμμα προβολών στη σελίδα Thessaloniki Guide.');
  }

  return {
    ok: movies.length > 0,
    url: fetched.url,
    movies,
    programText: parsed.programText,
    warnings,
    stats: parsed.stats,
    parseSource: 'thessalonikiguide',
    dateRange: weekBounds
      ? { start: weekBounds.start, end: weekBounds.end }
      : null,
  };
}

module.exports = {
  normalizeThessalonikiGuideCinemaUrl,
  moviesFromThessalonikiGuideHtml,
  fetchThessalonikiGuideCinemaHtml,
  scrapeThessalonikiGuideCinemaProgram,
};
