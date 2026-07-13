'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const { fetchMore, formatMoreNetworkError } = require('./moreHttp');
const { fetchMoreEventsByGroupCode } = require('./moreApi');
const { collectVenueBundleCodes, collectTheaterVenueBundleCodes } = require('./moreEventGroupCodes');

const MORE_CINEMA_WARMUP = 'https://www.more.com/gr-el/tickets/cinema/';
const MORE_THEATER_WARMUP = 'https://www.more.com/gr-el/tickets/theater/';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = Number(process.env.MORE_VENUE_SCRAPE_TIMEOUT_MS || 22_000);
/** HTML scrape more.com — default off (από server/VPS συχνά timeout· JSON getevents δουλεύει). */
const SCRAPE_ENABLED = process.env.MORE_VENUE_PROGRAM_SCRAPE === 'true';
/** Scrape κατά sync — αργό (HTML fetch). Default off· ενεργό μόνο με MORE_VENUE_SCRAPE_ON_SYNC=true. */
const SCRAPE_ON_SYNC = process.env.MORE_VENUE_SCRAPE_ON_SYNC === 'true';
/**
 * Scrape σελίδας χώρου μόνο όταν μείνουν μελλοντικές προβολές χωρίς ταύτιση (δύο φάσεις ανά venue).
 * Default on — απενεργοποίηση: MORE_VENUE_BUNDLE_SCRAPE=false
 */
const BUNDLE_SYNC_SCRAPE_ENABLED = process.env.MORE_VENUE_BUNDLE_SCRAPE !== 'false';
const SCRAPE_DELAY_MS = Number(process.env.MORE_VENUE_SCRAPE_DELAY_MS || 50);

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

function isMoreComProgramUrl(raw) {
  try {
    const u = new URL(normalizeMoreUrl(raw));
    return /(^|\.)more\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
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

async function fetchText(url, cookie = '', timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    };
    if (cookie) headers.Cookie = cookie;
    const res = await fetchMore(url, { signal: controller.signal, headers, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { text: await res.text(), cookie: cookiesFromResponse(res) || cookie };
  } catch (e) {
    throw formatMoreNetworkError(e, {
      url,
      timeoutMs,
      label: 'venue scrape More',
    });
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

  const jsonPreview = (() => {
    try {
      const sample = {
        events: mappedEvents.slice(0, 2),
        plays: plays.slice(0, 2),
      };
      const s = JSON.stringify(sample);
      return s.length > 720 ? `${s.slice(0, 720)}…` : s;
    } catch {
      return '';
    }
  })();

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
    jsonPreview,
  };
}

async function fetchTextViaCurl(url, cookie = '', timeoutMs = FETCH_TIMEOUT_MS) {
  const args = [
    '-sS',
    '--http1.1',
    '--max-time',
    String(Math.max(8, Math.ceil(timeoutMs / 1000))),
    '-H',
    `User-Agent: ${USER_AGENT}`,
    '-H',
    'Accept: text/html,application/xhtml+xml',
  ];
  if (cookie) args.push('-H', `Cookie: ${cookie}`);
  args.push(url);
  const { stdout } = await execFileAsync('curl', args, {
    maxBuffer: 14 * 1024 * 1024,
    encoding: 'utf8',
  });
  if (!stdout || stdout.length < 400) {
    throw new Error('curl_empty_response');
  }
  return { text: stdout, cookie };
}

async function fetchVenueProgramHtml(
  url,
  cookie = '',
  timeoutMs = FETCH_TIMEOUT_MS,
  { curlFallback = false, fetchFirst = false } = {},
) {
  if (fetchFirst && curlFallback) {
    try {
      return await fetchText(url, cookie, timeoutMs);
    } catch {
      return await fetchTextViaCurl(url, cookie, timeoutMs);
    }
  }
  if (curlFallback) {
    try {
      return await fetchTextViaCurl(url, cookie, timeoutMs);
    } catch {
      /* δοκίμασε fetch */
    }
  }
  try {
    return await fetchText(url, cookie, timeoutMs);
  } catch (primaryErr) {
    if (!curlFallback) throw primaryErr;
    return await fetchTextViaCurl(url, cookie, timeoutMs);
  }
}

async function scrapeMoreVenueProgramPage(
  url,
  cookie = '',
  { skipDelay = false, curlFallback = false, fetchFirst = false } = {},
) {
  if (!skipDelay && SCRAPE_DELAY_MS > 0) await sleep(SCRAPE_DELAY_MS);
  const page = await fetchVenueProgramHtml(url, cookie, FETCH_TIMEOUT_MS, {
    curlFallback,
    fetchFirst,
  });
  const payload = parseBookingPanelPayload(page.text);
  if (!payload) {
    return { ok: false, error: 'no_booking_panel', moreLink: url };
  }
  const mapped = mapScrapePayload(payload);
  return { ...mapped, moreLink: url };
}

/**
 * Επιφανειακό scrape σελίδας προγράμματος σινεμά/θεάτρου (more_link).
 * bookingPanel.init → events + plays (play-title).
 *
 * @param {string} moreLink
 * @param {{ force?: boolean }} [options] — force: bundle sync (χωρίς MORE_VENUE_PROGRAM_SCRAPE)
 * @returns {Promise<object>}
 */
async function scrapeMoreVenueProgram(moreLink, options = {}) {
  const force = options.force === true;
  if (!force && !SCRAPE_ENABLED) {
    return { ok: false, error: 'scrape_disabled', moreLink: normalizeMoreUrl(moreLink) };
  }

  const url = normalizeMoreUrl(moreLink);
  if (!url) return { ok: false, error: 'empty_url' };

  try {
    if (force) {
      const direct = await scrapeMoreVenueProgramPage(url, '', {
        skipDelay: true,
        curlFallback: true,
        fetchFirst: true,
      });
      if (direct.ok) return direct;
      return {
        ok: false,
        error: direct.error || 'bundle_scrape_failed',
        moreLink: url,
      };
    }
    const warmup = await fetchVenueProgramHtml(MORE_CINEMA_WARMUP, '', FETCH_TIMEOUT_MS);
    return await scrapeMoreVenueProgramPage(url, warmup.cookie);
  } catch (e) {
    return {
      ok: false,
      error: e?.message || String(e),
      moreLink: url,
    };
  }
}

/**
 * Διαγνωστικό: ένα warmup + δοκιμή λίστας more_link (χωρίς επανάληψη warmup ανά URL).
 * @param {string[]} urls
 * @param {{ timeoutMs?: number, onProgress?: (n: number, total: number, url: string) => void, delayMs?: number }} [options]
 */
async function probeVenueProgramScrape(urls, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? FETCH_TIMEOUT_MS);
  const delayMs = options.delayMs ?? SCRAPE_DELAY_MS;
  const onProgress = options.onProgress;
  const unique = [...new Set((urls || []).map(normalizeMoreUrl).filter(Boolean))];

  const failAll = (warmupError) => ({
    at: new Date().toISOString(),
    warmup: { ok: false, error: warmupError },
    summary: {
      total: unique.length,
      ok: 0,
      empty: 0,
      noBookingPanel: 0,
      timeout: 0,
      error: 0,
      skippedWarmup: unique.length,
    },
    entries: unique.map((url) => ({
      url,
      status: 'warmup_failed',
      error: warmupError,
      eventCount: 0,
      playCount: 0,
    })),
  });

  if (!unique.length) {
    return {
      at: new Date().toISOString(),
      warmup: { ok: false, error: 'no_urls' },
      summary: {
        total: 0,
        ok: 0,
        empty: 0,
        noBookingPanel: 0,
        timeout: 0,
        error: 0,
        skippedWarmup: 0,
      },
      entries: [],
    };
  }

  let cookie = '';
  try {
    const warmup = await fetchText(MORE_CINEMA_WARMUP, '', timeoutMs);
    cookie = warmup.cookie;
  } catch (e) {
    return failAll(e?.message || String(e));
  }

  const entries = [];
  let ok = 0;
  let empty = 0;
  let noBookingPanel = 0;
  let timeout = 0;
  let error = 0;

  for (let i = 0; i < unique.length; i += 1) {
    const url = unique[i];
    if (onProgress) onProgress(i + 1, unique.length, url);
    const started = Date.now();
    try {
      if (delayMs > 0 && i > 0) await sleep(delayMs);
      const page = await fetchText(url, cookie, timeoutMs);
      const payload = parseBookingPanelPayload(page.text);
      if (!payload) {
        noBookingPanel += 1;
        entries.push({
          url,
          status: 'no_booking_panel',
          ms: Date.now() - started,
          eventCount: 0,
          playCount: 0,
        });
        continue;
      }
      const mapped = mapScrapePayload(payload);
      if (mapped.ok) {
        ok += 1;
        entries.push({
          url,
          status: 'ok',
          ms: Date.now() - started,
          eventCount: mapped.eventCount,
          playCount: mapped.playCount,
          uniqueTitles: mapped.uniqueTitles.slice(0, 12),
        });
      } else {
        empty += 1;
        entries.push({
          url,
          status: 'empty',
          ms: Date.now() - started,
          eventCount: 0,
          playCount: 0,
        });
      }
    } catch (e) {
      const msg = e?.message || String(e);
      if (/timeout|abort/i.test(msg)) timeout += 1;
      else error += 1;
      entries.push({
        url,
        status: /timeout|abort/i.test(msg) ? 'timeout' : 'error',
        error: msg,
        ms: Date.now() - started,
        eventCount: 0,
        playCount: 0,
      });
    }
  }

  return {
    at: new Date().toISOString(),
    warmup: { ok: true },
    summary: {
      total: unique.length,
      ok,
      empty,
      noBookingPanel,
      timeout,
      error,
      skippedWarmup: 0,
    },
    entries,
  };
}

function createVenueScrapeCache(options = {}) {
  const forBundleSync = options.forBundleSync === true;
  const forceScrape = forBundleSync && BUNDLE_SYNC_SCRAPE_ENABLED;
  const cache = new Map();
  return {
    async get(moreLink) {
      const url = normalizeMoreUrl(moreLink);
      if (!url) return { ok: false, error: 'empty_url' };
      if (cache.has(url)) return cache.get(url);
      const result = await scrapeMoreVenueProgram(url, { force: forceScrape });
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

function lookupScrapedEventRow(byEventId, eventId) {
  if (!byEventId) return null;
  const key = String(eventId ?? '').trim();
  if (!key) return null;
  const direct = byEventId.get(key);
  if (direct) return direct;
  const num = Number(key);
  if (Number.isFinite(num)) return byEventId.get(String(num)) ?? null;
  return null;
}

function resolveVenueMoreProgramLink(venue) {
  const direct = String(venue?.more_link ?? venue?.moreLink ?? '').trim();
  if (direct) return direct;
  const slug = String(venue?.slug ?? '').trim();
  if (slug) return `/gr-el/tickets/cinema/${slug}/`;
  return '';
}

let cinemaListingHtmlCache = null;
let cinemaListingHtmlFetchedAt = 0;
let theaterListingHtmlCache = null;
let theaterListingHtmlFetchedAt = 0;
const CINEMA_LISTING_CACHE_MS = Number(process.env.MORE_CINEMA_LISTING_CACHE_MS || 6 * 60 * 60 * 1000);

const LISTING_KIND = {
  cinema: {
    warmupUrl: MORE_CINEMA_WARMUP,
    pathPrefix: '/gr-el/tickets/cinema/',
    getCache: () => cinemaListingHtmlCache,
    setCache: (html) => {
      cinemaListingHtmlCache = html;
      cinemaListingHtmlFetchedAt = Date.now();
    },
    getFetchedAt: () => cinemaListingHtmlFetchedAt,
  },
  theater: {
    warmupUrl: MORE_THEATER_WARMUP,
    pathPrefix: '/gr-el/tickets/theater/',
    getCache: () => theaterListingHtmlCache,
    setCache: (html) => {
      theaterListingHtmlCache = html;
      theaterListingHtmlFetchedAt = Date.now();
    },
    getFetchedAt: () => theaterListingHtmlFetchedAt,
  },
};

function venueListingKind(venue) {
  const t = String(venue?.type ?? '').toLowerCase();
  if (t === 'theater' || t === 'theatre') return 'theater';
  return 'cinema';
}

function collectVenueBundleCodesForListing(venue) {
  if (venueListingKind(venue) === 'theater') {
    return collectTheaterVenueBundleCodes(venue);
  }
  return collectVenueBundleCodes(venue);
}

async function loadMoreListingHtml(kind) {
  const cfg = LISTING_KIND[kind] || LISTING_KIND.cinema;
  const now = Date.now();
  if (cfg.getCache() && now - cfg.getFetchedAt() < CINEMA_LISTING_CACHE_MS) {
    return cfg.getCache();
  }
  const page = await fetchVenueProgramHtml(cfg.warmupUrl, '', FETCH_TIMEOUT_MS, {
    curlFallback: true,
    fetchFirst: true,
  });
  cfg.setCache(page.text || '');
  return cfg.getCache();
}

function extractProgramHrefNearBundleCode(html, eventGroupCode, pathPrefix) {
  const code = String(eventGroupCode || '').trim();
  if (!code || !html) return '';

  const esc = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const codeIdx = html.search(new RegExp(`data-code=["']${esc}["']`, 'i'));
  if (codeIdx < 0) return '';

  const window = html.slice(codeIdx, codeIdx + 4000);
  // Θερινά σινεμά: meta content="/gr-el/tickets/cinemas/…" (όχι μόνο /cinema/).
  const hrefRe = /(?:href|content)=["'](\/gr-el\/tickets\/cinemas?\/[^"'?#]+?\/)["']/i;
  const match = window.match(hrefRe);
  if (match?.[1]) return normalizeMoreUrl(match[1]);

  if (pathPrefix) {
    const prefixEsc = pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const legacyRe = new RegExp(
      `(?:href|content)=["'](${prefixEsc}[^"'?#]+/?)["']`,
      'i',
    );
    const legacy = window.match(legacyRe);
    if (legacy?.[1]) return normalizeMoreUrl(legacy[1]);
  }

  return '';
}

/** Scrape σελίδας χώρου πρέπει να έχει κοινά eventId με το bundle API — όχι λάθος σινεμά από listing. */
async function scrapeOverlapsBundleCodes(scrape, bundleCodes) {
  if (!scrape?.ok || !scrape?.byEventId?.size) return false;
  const codes = (bundleCodes || []).map((c) => String(c || '').trim()).filter(Boolean);
  if (!codes.length) return true;

  const scrapedIds = new Set([...scrape.byEventId.keys()]);
  for (const code of codes) {
    let events = [];
    try {
      events = await fetchMoreEventsByGroupCode(code);
    } catch {
      continue;
    }
    const apiIds = events.map((e) => String(e?.eventId ?? '').trim()).filter(Boolean);
    if (!apiIds.length) continue;
    for (const id of apiIds) {
      if (scrapedIds.has(id)) return true;
    }
  }
  return false;
}

/** Σελίδα καταλόγου more.com: canonical href προγράμματος από bundle eventGroupCode (σινεμά ή θέατρο). */
async function lookupMoreLinkFromListing(eventGroupCode, kind = 'cinema') {
  const code = String(eventGroupCode || '').trim();
  if (!code) return '';

  const listingKind = LISTING_KIND[kind] ? kind : 'cinema';
  const cfg = LISTING_KIND[listingKind];
  const html = await loadMoreListingHtml(listingKind);
  if (!html) return '';

  return extractProgramHrefNearBundleCode(html, code, cfg.pathPrefix);
}

/** @deprecated alias */
async function lookupCinemaMoreLinkFromListing(eventGroupCode) {
  return lookupMoreLinkFromListing(eventGroupCode, 'cinema');
}

async function loadMoreCinemaListingHtml() {
  return loadMoreListingHtml('cinema');
}

/**
 * Όλα τα πιθανά URLs προγράμματος χώρου — ισχύει για κάθε σινεμά/θέατρο με bundle code.
 * Σειρά: more.com more_link (CMS) → κατάλογος more.com (ανά bundle) → slug CMS.
 * Εξωτερικά more_link (ιστοσελίδα χώρου) αγνοούνται — δεν έχουν booking panel.
 */
async function collectVenueMoreProgramLinkCandidates(venue) {
  const candidates = [];
  const add = (raw) => {
    const url = normalizeMoreUrl(raw);
    if (url && !candidates.includes(url)) candidates.push(url);
  };

  const kind = venueListingKind(venue);
  const cfg = LISTING_KIND[kind] || LISTING_KIND.cinema;

  const directLink = venue?.more_link ?? venue?.moreLink;
  if (directLink && isMoreComProgramUrl(directLink)) {
    add(directLink);
  }

  const slug = String(venue?.slug ?? '').trim();
  if (slug) {
    add(`${cfg.pathPrefix}${slug}/`);
    if (kind === 'cinema') {
      add(`/gr-el/tickets/cinemas/${slug}/`);
    }
  }

  for (const code of collectVenueBundleCodesForListing(venue)) {
    try {
      const fromListing = await lookupMoreLinkFromListing(code, kind);
      if (fromListing) add(fromListing);
    } catch {
      /* optional */
    }
  }

  return candidates;
}

async function resolveVenueMoreProgramLinkForScrape(venue) {
  const candidates = await collectVenueMoreProgramLinkCandidates(venue);
  return candidates[0] || '';
}

/** Δοκιμάζει όλα τα πιθανά URLs μέχρι να βρει σελίδα με booking panel. */
async function loadVenueScrapeWithFallback(venue, scrapeCache) {
  const candidates = await collectVenueMoreProgramLinkCandidates(venue);
  const bundleCodes = collectVenueBundleCodesForListing(venue);
  const tried = [];
  if (!candidates.length) {
    return { url: null, result: { ok: false, error: 'no_candidates' }, tried, candidates };
  }

  let lastOk = null;
  for (const url of candidates) {
    const result = await scrapeCache.get(url);
    const entry = {
      url,
      ok: result?.ok === true,
      error: result?.error || null,
      eventCount: result?.eventCount || 0,
    };
    tried.push(entry);
    if (!result?.ok) continue;
    lastOk = { url, result };

    const overlaps = await scrapeOverlapsBundleCodes(result, bundleCodes);
    if (overlaps) return { url, result, tried, candidates };
    entry.rejected = 'bundle_event_mismatch';
  }

  if (lastOk) return { ...lastOk, tried, candidates };

  const last = await scrapeCache.get(candidates[0]);
  return { url: candidates[0], result: last, tried, candidates };
}

module.exports = {
  SCRAPE_ENABLED,
  SCRAPE_ON_SYNC,
  BUNDLE_SYNC_SCRAPE_ENABLED,
  scrapeMoreVenueProgram,
  resolveVenueMoreProgramLink,
  resolveVenueMoreProgramLinkForScrape,
  collectVenueMoreProgramLinkCandidates,
  loadVenueScrapeWithFallback,
  lookupMoreLinkFromListing,
  lookupCinemaMoreLinkFromListing,
  lookupScrapedEventRow,
  probeVenueProgramScrape,
  createVenueScrapeCache,
  findCmsVenueForBundleCode,
  normalizeMoreUrl,
};
