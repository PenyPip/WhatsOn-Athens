'use strict';

const MORE_CINEMA_WARMUP = 'https://www.more.com/gr-el/tickets/cinema/';
const USER_AGENT = 'Mozilla/5.0 (compatible; whatson-more-venue-scrape/1.0)';
const FETCH_TIMEOUT_MS = Number(process.env.MORE_VENUE_SCRAPE_TIMEOUT_MS || 22_000);
const SCRAPE_ENABLED = process.env.MORE_VENUE_PROGRAM_SCRAPE !== 'false';
/** Scrape κατά sync — αργό (HTML fetch). Default off· ενεργό μόνο στο lookup. */
const SCRAPE_ON_SYNC = process.env.MORE_VENUE_SCRAPE_ON_SYNC === 'true';
const SCRAPE_DELAY_MS = Number(process.env.MORE_VENUE_SCRAPE_DELAY_MS || 180);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMoreUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return `https://www.more.com${s}`;
  return `https://www.more.com/${s.replace(/^\//, '')}`;
}

function cookiesFromResponse(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .filter(Boolean)
      .join('; ');
  }
  const single = res.headers.get('set-cookie');
  if (!single) return '';
  return single
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function fetchText(url, cookie = '') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers = {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    };
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(url, { signal: controller.signal, headers, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { text: await res.text(), cookie: cookiesFromResponse(res) || cookie };
  } finally {
    clearTimeout(timer);
  }
}

function extractBalancedJson(text, startIdx) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

function parseBookingPanelPayload(html) {
  const m = html.match(/bookingPanel\.init\s*\(\s*(\{)/);
  if (m?.index != null) {
    const start = m.index + m[0].length - 1;
    const jsonText = extractBalancedJson(html, start);
    if (jsonText) {
      try {
        return JSON.parse(jsonText);
      } catch {
        /* fallback below */
      }
    }
  }

  const playsMatch = html.match(/"plays"\s*:\s*(\[[\s\S]*?\])\s*,\s*"pricelists"/);
  const eventsMatch = html.match(/"events"\s*:\s*(\[[\s\S]*?\])\s*,\s*"days"/);
  if (!eventsMatch) return null;

  try {
    const events = JSON.parse(eventsMatch[1]);
    const plays = playsMatch ? JSON.parse(playsMatch[1]) : [];
    return { events, plays };
  } catch {
    return null;
  }
}

function mapScrapePayload(payload) {
  const plays = Array.isArray(payload?.plays) ? payload.plays : [];
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const playTitleById = new Map();
  for (const play of plays) {
    const id = String(play?.id ?? play?.playId ?? '').trim();
    const title = String(play?.['play-title'] ?? play?.playTitle ?? play?.title ?? '').trim();
    if (id && title) playTitleById.set(id, title);
  }

  const mappedEvents = [];
  const byEventId = new Map();

  for (const ev of events) {
    const eventId = String(ev?.eventId ?? '').trim();
    if (!eventId) continue;
    const playId = String(ev?.playId ?? '').trim();
    const playTitle = playTitleById.get(playId) || '';
    const eventDate = String(ev?.['event-date'] ?? ev?.eventDate ?? '').trim();
    const row = {
      eventId,
      playId: playId || null,
      playTitle,
      eventDate,
      soldOut: ev?.isSoldout === true || ev?.isSoldOut === true,
    };
    mappedEvents.push(row);
    byEventId.set(eventId, row);
  }

  const uniqueTitles = [...new Set(mappedEvents.map((e) => e.playTitle).filter(Boolean))];

  return {
    ok: mappedEvents.length > 0,
    events: mappedEvents,
    plays: plays.map((p) => ({
      id: String(p?.id ?? '').trim(),
      playTitle: String(p?.['play-title'] ?? p?.playTitle ?? '').trim(),
    })),
    byEventId,
    uniqueTitles,
    eventCount: mappedEvents.length,
    playCount: uniqueTitles.length,
  };
}

/**
 * Επιφανειακό scrape σελίδας προγράμματος σινεμά/θεάτρου (more_link).
 * bookingPanel.init → events + plays (play-title).
 *
 * @param {string} moreLink
 * @returns {Promise<object>}
 */
async function scrapeMoreVenueProgram(moreLink) {
  if (!SCRAPE_ENABLED) {
    return { ok: false, error: 'scrape_disabled', moreLink: normalizeMoreUrl(moreLink) };
  }

  const url = normalizeMoreUrl(moreLink);
  if (!url) return { ok: false, error: 'empty_url' };

  try {
    const warmup = await fetchText(MORE_CINEMA_WARMUP);
    const cookie = warmup.cookie;
    if (SCRAPE_DELAY_MS > 0) await sleep(SCRAPE_DELAY_MS);
    const page = await fetchText(url, cookie);
    const payload = parseBookingPanelPayload(page.text);
    if (!payload) {
      return { ok: false, error: 'no_booking_panel', moreLink: url };
    }
    const mapped = mapScrapePayload(payload);
    return { ...mapped, moreLink: url };
  } catch (e) {
    return {
      ok: false,
      error: e?.message || String(e),
      moreLink: url,
    };
  }
}

function createVenueScrapeCache() {
  const cache = new Map();
  return {
    async get(moreLink) {
      const url = normalizeMoreUrl(moreLink);
      if (!url) return { ok: false, error: 'empty_url' };
      if (cache.has(url)) return cache.get(url);
      const result = await scrapeMoreVenueProgram(url);
      cache.set(url, result);
      return result;
    },
    size() {
      return cache.size;
    },
  };
}

function findCmsVenueForBundleCode(eventGroupCode, cmsVenues) {
  const code = String(eventGroupCode || '').trim();
  if (!code) return null;
  for (const venue of cmsVenues || []) {
    const codes = new Set();
    const add = (raw) => {
      const c = String(raw || '').trim();
      if (c) codes.add(c);
    };
    add(venue.event_group_code ?? venue.eventGroupCode);
    const groups = venue.more_event_groups ?? venue.moreEventGroups ?? [];
    for (const g of groups) add(g?.code ?? g?.attributes?.code);
    if (codes.has(code)) return venue;
  }
  return null;
}

module.exports = {
  SCRAPE_ENABLED,
  SCRAPE_ON_SYNC,
  scrapeMoreVenueProgram,
  createVenueScrapeCache,
  findCmsVenueForBundleCode,
  normalizeMoreUrl,
};
