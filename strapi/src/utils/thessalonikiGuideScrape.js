'use strict';

const {
  parseAuditoriumScheduleText,
  normalizeHallName,
  isSummerScreeningLabel,
} = require('./programTextParser');

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
  const wrapped = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!wrapped) return { hall: text, note: null };
  const inner = wrapped[2].trim();
  if (/μεταγλ|υποτ/i.test(inner)) return { hall: wrapped[1].trim(), note: inner };
  return { hall: text, note: null };
}

function dayToken(label) {
  const m = String(label || '').match(/^(Δε|Τρ|Τε|Πε|Πα|Σα|Κυ)(?=\s|\d|$)/u);
  return m ? m[1] : '';
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
  const start = String(html || '').search(/Ταινίες της Εβδομάδας/i);
  const slice = start >= 0 ? html.slice(start) : String(html || '');
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

/**
 * HTML κινηματογράφου Thessaloniki Guide → movies με hallName ανά προβολή.
 * Πίνακας: αίθουσα, ημέρες (Πε 1/10 …), ώρες ανά ημέρα.
 */
function moviesFromThessalonikiGuideHtml(html, { weekBounds = null } = {}) {
  if (!weekBounds?.start || !weekBounds?.end) {
    return { movies: [], programText: '', stats: { cardCount: 0, scheduleLines: 0, showtimeCount: 0, movieCount: 0 } };
  }

  const movies = [];
  const textBlocks = [];
  let scheduleLines = 0;
  let showtimeCount = 0;

  for (const article of movieArticles(html)) {
    const title = movieTitle(article);
    if (!title) continue;
    const showtimes = [];
    const scheduleTextLines = [];

    for (const table of tablesFromArticle(article)) {
      const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
      if (rows.length < 3) continue;
      const hallRaw = cellLines(rowCells(rows[0])[0] || []).join(' ');
      const { hall, note } = splitHallLabel(hallRaw);
      if (!hall) continue;
      const summerScreening = isSummerScreeningLabel(hall) || isSummerScreeningLabel(note);
      const hallName = summerScreening ? null : normalizeHallName(hall);
      const days = rowCells(rows[1]).map((cell) => dayToken(cellLines(cell).join(' ')));
      const timeCells = rowCells(rows[2]).map((cell) => timesFromLines(cellLines(cell)));
      const width = Math.min(days.length, timeCells.length);

      for (let i = 0; i < width; i += 1) {
        const day = days[i];
        const times = timeCells[i];
        if (!day || !times.length) continue;
        scheduleLines += 1;
        const schedule = note ? `${day}: ${times.join(' / ')} (${note})` : `${day}: ${times.join(' / ')}`;
        const roomLabel = hallName || hall;
        scheduleTextLines.push(`${roomLabel} ${schedule}`);
        showtimes.push(
          ...parseAuditoriumScheduleText(schedule, weekBounds.start, weekBounds.end, {
            summerScreening,
            hallName,
          }),
        );
      }
    }

    const byKey = new Map();
    for (const st of showtimes) {
      const key = `${st.datetime.toISOString()}|${st.hallName || ''}|${st.note || ''}`;
      if (!byKey.has(key)) byKey.set(key, st);
    }
    const unique = [...byKey.values()].sort((a, b) => a.datetime - b.datetime);
    if (!unique.length) continue;
    showtimeCount += unique.length;
    movies.push({
      title,
      scheduleText: scheduleTextLines.join('\n'),
      showtimes: unique,
    });
    textBlocks.push([title, 'Προβολές', ...scheduleTextLines, ''].join('\n'));
  }

  movies.sort((a, b) => a.title.localeCompare(b.title, 'el'));
  return {
    movies,
    programText: textBlocks.join('\n').trim(),
    stats: {
      cardCount: movies.length,
      scheduleLines,
      showtimeCount,
      movieCount: movies.length,
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
  const warnings = [];
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
