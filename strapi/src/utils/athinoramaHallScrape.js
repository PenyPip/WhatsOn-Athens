'use strict';

const { formatWeekLabel } = require('./cinemaWeek');

const FETCH_TIMEOUT_MS = Number(process.env.ATHINORAMA_FETCH_TIMEOUT_MS || 25_000);
const USER_AGENT =
  process.env.ATHINORAMA_USER_AGENT ||
  'Mozilla/5.0 (compatible; WhatsOnProgramImport/1.0; +https://the37n.gr)';

function normalizeAthinoramaHallUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  let url;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  if (host !== 'athinorama.gr') return null;
  if (!/\/cinema\/halls\//i.test(url.pathname)) return null;
  url.hash = '';
  return url.toString();
}

function parseLdJsonBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = String(m[1] || '').trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) out.push(...data);
      else if (data) out.push(data);
    } catch {
      // ignore bad blocks
    }
  }
  return out;
}

function screeningEventsFromLd(blocks) {
  const events = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const type = block['@type'];
    if (type === 'ScreeningEvent') {
      events.push(block);
      continue;
    }
    if (Array.isArray(type) && type.includes('ScreeningEvent')) {
      events.push(block);
    }
  }
  return events;
}

function movieTitleFromEvent(ev) {
  const work = ev?.workPresented;
  const name = work?.name || ev?.name;
  return String(name || '').trim();
}

function datetimeFromEvent(ev) {
  const raw = ev?.startDate;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function inWeekBounds(dt, weekBounds) {
  if (!weekBounds?.start || !weekBounds?.end) return true;
  const t = dt.getTime();
  return t >= weekBounds.start.getTime() && t <= weekBounds.end.getTime();
}

/**
 * Ομαδοποίηση ScreeningEvent → μορφή parser (title + showtimes).
 */
function moviesFromScreeningEvents(events, { weekBounds = null } = {}) {
  const byTitle = new Map();
  let totalEvents = 0;
  let inWeek = 0;

  for (const ev of events) {
    const title = movieTitleFromEvent(ev);
    const datetime = datetimeFromEvent(ev);
    if (!title || !datetime) continue;
    totalEvents += 1;
    if (!inWeekBounds(datetime, weekBounds)) continue;
    inWeek += 1;
    if (!byTitle.has(title)) {
      byTitle.set(title, {
        title,
        scheduleText: '',
        showtimes: [],
        _keys: new Set(),
      });
    }
    const row = byTitle.get(title);
    const key = `${datetime.toISOString()}`;
    if (row._keys.has(key)) continue;
    row._keys.add(key);
    row.showtimes.push({ datetime, note: null });
  }

  const movies = [...byTitle.values()].map((row) => {
    row.showtimes.sort((a, b) => a.datetime - b.datetime);
    delete row._keys;
    return row;
  });
  movies.sort((a, b) => a.title.localeCompare(b.title, 'el'));

  return {
    movies,
    stats: { totalEvents, inWeek, movieCount: movies.length },
  };
}

/**
 * Εξαγωγή κειμένου «Ταινίες / Προβολές» για προβολή/επεξεργασία στο textarea.
 * Κρατά τίτλους + γραμμές Αίθουσα … (ίδια μορφή με manual paste).
 */
function extractAthinoramaProgramText(html) {
  let body = String(html || '');
  body = body.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  body = body.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  body = body.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const startMarkers = [/ταινίες\s*\/\s*προβολές/i, /ταινίες\s+προβολές/i];
  let startIdx = -1;
  for (const re of startMarkers) {
    const m = body.match(re);
    if (m && m.index != null) {
      startIdx = m.index;
      break;
    }
  }
  if (startIdx < 0) startIdx = 0;

  let slice = body.slice(startIdx);
  const endMarkers = [/sign\s*in/i, /όλες\s+οι\s+αίθουσες/i, /δέσμη\s+εκδοτική/i, /<\/footer>/i];
  for (const re of endMarkers) {
    const m = slice.match(re);
    if (m && m.index != null && m.index > 200) {
      slice = slice.slice(0, m.index);
      break;
    }
  }

  // Keep headings / strong / list items as newlines
  slice = slice
    .replace(/<\/(h[1-6]|p|div|li|tr|br|section|article)>/gi, '\n')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\u00a0/g, ' ');

  const lines = slice
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const skipExact = new Set([
    'ταινίες / προβολές',
    'προβολές',
    'αναλυτικό πρόγραμμα ανά ημέρα',
    'εμφάνιση χάρτη',
  ]);
  const out = [];
  for (const line of lines) {
    const low = line.toLocaleLowerCase('el');
    if (skipExact.has(low)) continue;
    if (/^ thriller|^θρίλερ$|^animation$|^περιπέτεια$/i.test(low) && line.length < 40) continue;
    // Drop pure rating like "3" / "3,5"
    if (/^\d([.,]\d)?$/.test(line)) continue;
    // Drop long synopses (no times, long)
    if (line.length > 160 && !/\d{1,2}[.:]\d{2}/.test(line) && !/^αίθουσα\s/i.test(line)) {
      continue;
    }
    out.push(line);
  }

  // Prefer compact blocks: title then auditorium lines
  return out.join('\n').trim();
}

async function fetchAthinoramaHallHtml(url) {
  const normalized = normalizeAthinoramaHallUrl(url);
  if (!normalized) {
    return { ok: false, error: 'Άκυρο Athinorama URL — περίμενε /cinema/halls/…' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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
      return { ok: false, error: `Athinorama HTTP ${res.status}`, url: normalized };
    }
    const html = await res.text();
    if (!html || html.length < 500) {
      return { ok: false, error: 'Κενή/πολύ μικρή απάντηση από Athinorama', url: normalized };
    }
    return { ok: true, html, url: normalized };
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'Timeout Athinorama' : e?.message || String(e);
    return { ok: false, error: msg, url: normalized };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch σελίδας αίθουσας Athinorama → parsed movies για program-import.
 */
async function scrapeAthinoramaHallProgram(url, { weekBounds = null } = {}) {
  const fetched = await fetchAthinoramaHallHtml(url);
  if (!fetched.ok) return fetched;

  const blocks = parseLdJsonBlocks(fetched.html);
  const events = screeningEventsFromLd(blocks);
  const { movies, stats } = moviesFromScreeningEvents(events, { weekBounds });
  const programText = extractAthinoramaProgramText(fetched.html);

  const warnings = [];
  if (!events.length) {
    warnings.push('Δεν βρέθηκαν ScreeningEvent στο JSON-LD της σελίδας.');
  }
  if (events.length && !movies.length) {
    const weekHint = weekBounds
      ? ` στην επιλεγμένη εβδομάδα (${formatWeekLabel(weekBounds.start, weekBounds.end)})`
      : '';
    warnings.push(`Βρέθηκαν ${stats.totalEvents} προβολές στο Athinorama, αλλά καμία${weekHint}.`);
  }
  if (stats.totalEvents > stats.inWeek && weekBounds) {
    warnings.push(
      `Φιλτράρισμα εβδομάδας: ${stats.inWeek}/${stats.totalEvents} προβολές μέσα στο εύρος.`,
    );
  }

  return {
    ok: movies.length > 0,
    url: fetched.url,
    movies,
    programText,
    warnings,
    stats,
    dateRange: weekBounds
      ? { start: weekBounds.start, end: weekBounds.end, inferred: true }
      : null,
    parseSource: 'athinorama',
    error: movies.length ? null : warnings[0] || 'Δεν βρέθηκαν προβολές.',
  };
}

module.exports = {
  normalizeAthinoramaHallUrl,
  scrapeAthinoramaHallProgram,
  extractAthinoramaProgramText,
  moviesFromScreeningEvents,
};
