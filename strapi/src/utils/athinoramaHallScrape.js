'use strict';

const { formatWeekLabel } = require('./cinemaWeek');
const {
  parseCinemaProgramText,
  parseAuditoriumScheduleText,
  normalizeHallName,
  isSummerScreeningLabel,
} = require('./programTextParser');

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
 * Το JSON-LD δεν έχει αίθουσα· ίδιες ώρες σε πολλές αίθουσες συγχωνεύονται.
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

function stripTagsKeepText(raw) {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Κάρτες προγράμματος Athinorama: τίτλος + room-box / schedule-box (χωρίς accordion).
 * Επιστρέφει κείμενο catalog μορφής για textarea + λίστα { title, room, schedule }.
 */
function extractAthinoramaHallCards(html) {
  let body = String(html || '');
  body = body.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  body = body.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  body = body.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const parts = body.split(/<div class="item\s+horizontal-dt[^"]*"[^>]*>/i);
  const cards = [];

  for (let i = 1; i < parts.length; i += 1) {
    let part = parts[i];
    const acc = part.search(/<div class="accordion"/i);
    if (acc >= 0) part = part.slice(0, acc);

    const linkBodies = [];
    const linkRe = /<a[^>]+href="\/cinema\/movie\/[^"]+"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(part)) !== null) {
      const t = stripTagsKeepText(lm[1]);
      if (t && t.length > 1 && !/^https?:/i.test(t)) linkBodies.push(t);
    }
    const title = linkBodies[0] || null;
    if (!title) continue;

    const schedules = [];
    const boxRe =
      /class="room-box">\s*([\s\S]*?)\s*<\/strong>\s*([\s\S]*?)\s*<\/p>/gi;
    let bm;
    while ((bm = boxRe.exec(part)) !== null) {
      const room = stripTagsKeepText(bm[1]);
      const schedule = stripTagsKeepText(bm[2]);
      if (!room || !schedule || !/\d{1,2}[.:]\d{2}/.test(schedule)) continue;
      schedules.push({ room, schedule });
    }
    if (!schedules.length) continue;
    cards.push({ title, schedules });
  }

  return cards;
}

function catalogTextFromHallCards(cards) {
  const lines = [];
  for (const card of cards || []) {
    if (!card?.title) continue;
    lines.push(card.title);
    lines.push('Προβολές');
    for (const row of card.schedules || []) {
      const room = String(row.room || '').trim();
      const schedule = String(row.schedule || '').trim();
      if (!room || !schedule) continue;
      lines.push(`${room} ${schedule}`.replace(/\s+/g, ' ').trim());
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

/**
 * Από κάρτες HTML → movies με hallName ανά showtime (πρωτεύουσα πηγή για πολυαιθουσικά).
 */
function moviesFromAthinoramaHallCards(cards, { weekBounds = null, now = new Date() } = {}) {
  if (!cards?.length || !weekBounds?.start || !weekBounds?.end) {
    return { movies: [], stats: { cardCount: 0, scheduleLines: 0, showtimeCount: 0 } };
  }

  const movies = [];
  let scheduleLines = 0;
  let showtimeCount = 0;

  for (const card of cards) {
    const showtimes = [];
    const scheduleTextLines = [];
    for (const row of card.schedules || []) {
      scheduleLines += 1;
      const line = `${row.room} ${row.schedule}`.replace(/\s+/g, ' ').trim();
      scheduleTextLines.push(line);
      const summerScreening =
        isSummerScreeningLabel(row.room) || isSummerScreeningLabel(row.schedule);
      const hallName = summerScreening ? null : normalizeHallName(row.room);
      showtimes.push(
        ...parseAuditoriumScheduleText(row.schedule, weekBounds.start, weekBounds.end, {
          summerScreening,
          hallName,
        }),
      );
    }
    // dedupe by datetime+hall
    const byKey = new Map();
    for (const st of showtimes) {
      const key = `${st.datetime.toISOString()}|${st.hallName || ''}`;
      if (!byKey.has(key)) byKey.set(key, st);
    }
    const unique = [...byKey.values()].sort((a, b) => a.datetime - b.datetime);
    showtimeCount += unique.length;
    movies.push({
      title: card.title,
      scheduleText: scheduleTextLines.join('\n'),
      showtimes: unique,
    });
  }

  movies.sort((a, b) => a.title.localeCompare(b.title, 'el'));
  return {
    movies,
    stats: {
      cardCount: cards.length,
      scheduleLines,
      showtimeCount,
      movieCount: movies.length,
    },
  };
}

/**
 * Εξαγωγή κειμένου «Ταινίες / Προβολές» για προβολή/επεξεργασία στο textarea.
 * Προτιμά τις κάρτες room-box (καθαρό catalog)· αλλιώς fallback σε γενικό strip.
 */
function extractAthinoramaProgramText(html) {
  const cards = extractAthinoramaHallCards(html);
  const fromCards = catalogTextFromHallCards(cards);
  if (fromCards && cards.length >= 1) return fromCards;

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
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const low = line.toLocaleLowerCase('el');
    if (skipExact.has(low)) continue;
    if (/^ thriller|^θρίλερ$|^animation$|^περιπέτεια$/i.test(low) && line.length < 40) continue;
    if (/^\d([.,]\d)?$/.test(line)) continue;
    if (line.length > 160 && !/\d{1,2}[.:]\d{2}/.test(line) && !/^αίθουσα\s/i.test(line)) {
      continue;
    }
    // Συγχώνευση «Αίθουσα X» + επόμενη γραμμή ωραρίου
    if (/^αίθουσα\s/i.test(line) && !/\d{1,2}[.:]\d{2}/.test(line) && i + 1 < lines.length) {
      const next = lines[i + 1];
      if (/\d{1,2}[.:]\d{2}/.test(next) && !/^αίθουσα\s/i.test(next)) {
        out.push(`${line} ${next}`.replace(/\s+/g, ' ').trim());
        i += 1;
        continue;
      }
    }
    out.push(line);
  }

  return out.join('\n').trim();
}

async function fetchAthinoramaHallHtml(url, { timeoutMs } = {}) {
  const normalized = normalizeAthinoramaHallUrl(url);
  if (!normalized) {
    return { ok: false, error: 'Άκυρο Athinorama URL — περίμενε /cinema/halls/…' };
  }

  const waitMs =
    Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : FETCH_TIMEOUT_MS;
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
 * Προτεραιότητα: HTML room-box (με αίθουσες) · fallback JSON-LD ScreeningEvent.
 */
async function scrapeAthinoramaHallProgram(url, { weekBounds = null, timeoutMs, now = new Date() } = {}) {
  const fetched = await fetchAthinoramaHallHtml(url, { timeoutMs });
  if (!fetched.ok) return fetched;

  const cards = extractAthinoramaHallCards(fetched.html);
  const programText =
    catalogTextFromHallCards(cards) || extractAthinoramaProgramText(fetched.html);
  const fromCards = moviesFromAthinoramaHallCards(cards, { weekBounds, now });

  const warnings = [];
  let movies = [];
  let stats = fromCards.stats;
  let parseSource = 'athinorama-html-halls';

  if (fromCards.movies.some((m) => (m.showtimes || []).length > 0)) {
    movies = fromCards.movies.filter((m) => (m.showtimes || []).length > 0);
    if (weekBounds) {
      warnings.push(
        `HTML αίθουσες: ${stats.scheduleLines} γραμμές → ${stats.showtimeCount} προβολές σε ${stats.movieCount} ταινίες.`,
      );
    }
  } else {
    // Fallback: catalog text parse (χειροκίνητο paste style)
    if (programText) {
      const parsed = parseCinemaProgramText(programText, { weekBounds, now });
      const withSt = (parsed.movies || []).filter((m) => (m.showtimes || []).length > 0);
      if (withSt.length) {
        movies = withSt;
        parseSource = 'athinorama-catalog-text';
        warnings.push(...(parsed.warnings || []));
      }
    }

    if (!movies.length) {
      const blocks = parseLdJsonBlocks(fetched.html);
      const events = screeningEventsFromLd(blocks);
      const fromLd = moviesFromScreeningEvents(events, { weekBounds });
      movies = fromLd.movies;
      stats = fromLd.stats;
      parseSource = 'athinorama-jsonld';
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
      warnings.push(
        'Χωρίς αίθουσες από HTML — χρησιμοποιήθηκε JSON-LD (ίδιες ώρες σε πολλές αίθουσες συγχωνεύονται).',
      );
    }
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
    parseSource,
    error: movies.length ? null : warnings[0] || 'Δεν βρέθηκαν προβολές.',
  };
}

module.exports = {
  normalizeAthinoramaHallUrl,
  scrapeAthinoramaHallProgram,
  extractAthinoramaProgramText,
  extractAthinoramaHallCards,
  moviesFromScreeningEvents,
  moviesFromAthinoramaHallCards,
};
