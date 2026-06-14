'use strict';

const MORE_CINEMA_URL = 'https://www.more.com/gr-el/tickets/cinema/';
const MORE_THEATER_URL = 'https://www.more.com/gr-el/tickets/theater/';
const MORE_GETEVENTS = 'https://www.more.com/_api/playdetails/getevents';
const USER_AGENT = 'whatson-more-lookup/1.0';
const FETCH_TIMEOUT_MS = Number(process.env.MORE_LOOKUP_FETCH_TIMEOUT_MS || 45_000);
const VERIFY_TIMEOUT_MS = Number(process.env.MORE_LOOKUP_VERIFY_TIMEOUT_MS || 20_000);
const VERIFY_CONCURRENCY = Number(process.env.MORE_LOOKUP_VERIFY_CONCURRENCY || 8);
const SCRAPE_LOOKUP_ENABLED = process.env.MORE_LOOKUP_VENUE_SCRAPE === 'true';
const SCRAPE_LOOKUP_MAX = Number(process.env.MORE_LOOKUP_VENUE_SCRAPE_MAX || 20);
const MIN_HINT_SCORE = 0.45;
const DEFAULT_MIN_SCORE = MIN_HINT_SCORE;
const DEFAULT_APPLY_MIN_SCORE = Number(process.env.MORE_LOOKUP_APPLY_MIN_SCORE || MIN_HINT_SCORE);
const {
  collectEventGroupCodes,
  resolveEventGroupCodesFromEntry,
  collectVenueBundleCodes,
  collectTheaterVenueBundleCodes,
  collectVenueEventGroupCodes,
  resolveVenueEventGroupCodesFromEntry,
  classifyCinemaCatalogKind,
  extractEvgCodeFromText,
  normalizeMoreVenueId,
  moreVenueIdLookupKeys,
} = require('./moreEventGroupCodes');
const {
  createVenueScrapeCache,
  findCmsVenueForBundleCode,
  normalizeMoreUrl,
  SCRAPE_ENABLED,
} = require('./moreVenueProgramScrape');
const { findBestCmsMatchByPlayTitle } = require('./morePlayTitleMatch');
const { fetchMore, formatMoreNetworkError } = require('./moreHttp');

const CMS_LOOKUP_CONFIG = {
  movie: {
    uid: 'api::movie.movie',
    moreCategory: 'cinema',
    catalogKind: 'movie',
  },
  theater_show: {
    uid: 'api::theater-show.theater-show',
    moreCategory: 'theater',
    catalogKind: 'show',
  },
  venue: {
    uid: 'api::venue.venue',
    moreCategory: 'cinema',
    catalogKind: 'venue_bundle',
  },
};

function cmsEntryTitle(entry, contentType) {
  if (contentType === 'venue') return entry?.name ?? entry?.title ?? '';
  return entry?.title ?? entry?.name ?? '';
}

function cmsIdRefs(contentType, id) {
  return {
    cmsId: id,
    movieId: contentType === 'movie' ? id : null,
    theaterShowId: contentType === 'theater_show' ? id : null,
    venueId: contentType === 'venue' ? id : null,
  };
}

function normalizeText(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function compactText(raw) {
  return normalizeText(raw).replace(/\s+/g, '');
}

function slugFromMoreUrl(url, category = 'cinema') {
  const pattern =
    category === 'theater' ? /\/theater\/([^/]+)/i : /\/cinemas?\/([^/]+)/i;
  const m = String(url || '').match(pattern);
  if (!m) return '';
  return decodeURIComponent(m[1])
    .replace(/-\d+$/, '')
    .replace(/-/g, ' ');
}

/** Slug σελίδας More από URL (π.χ. /gr-el/tickets/cinemas/the-pout-pout-fish/). */
function morePageSlugFromUrl(url) {
  const s = String(url || '').trim();
  const m =
    s.match(/\/tickets\/cinemas?\/([^/?#]+)/i) ||
    s.match(/\/tickets\/theater\/([^/?#]+)/i);
  if (!m) return '';
  return decodeURIComponent(m[1]).replace(/\/$/, '').toLowerCase();
}

/** Σύγκριση slug CMS ↔ More — αγνοεί παύλες/τόνους (the-pout-pout-fish ↔ thepout-poutfish). */
function compactSlugKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '');
}

function evgCodeSlugRoot(code) {
  return String(code || '')
    .replace(/^evg_/i, '')
    .split('_')[0]
    .toLowerCase();
}

function resolveMorePagePathFromChunk(chunk, category) {
  const urlContent = chunk.match(/itemprop="url"\s+content="([^"]+)"/i)?.[1]?.trim();
  if (urlContent) return urlContent;

  const pathPattern =
    category === 'theater'
      ? /href="(\/gr-el\/tickets\/theater\/[^"?#]+)/i
      : /href="(\/gr-el\/tickets\/cinemas?\/[^"?#]+)/i;
  return chunk.match(pathPattern)?.[1]?.trim() || '';
}

function parseMoreCatalogHtml(html, { category, classifyKind }) {
  const byCode = new Map();

  for (const m of html.matchAll(/data-code="(evg_[a-z0-9_-]+)"/gi)) {
    const code = m[1];
    if (byCode.has(code)) continue;

    const chunk = html.slice(Math.max(0, m.index - 200), m.index + 4000);
    const pagePath = resolveMorePagePathFromChunk(chunk, category);
    const morePathSlug = morePageSlugFromUrl(pagePath);
    const nameMatch = chunk.match(/itemprop="name"\s+content="([^"]+)"/i);
    const hMatch = chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]{2,120})</i);

    let title = nameMatch?.[1]?.trim() || hMatch?.[1]?.trim() || '';
    if (!title && pagePath) title = slugFromMoreUrl(pagePath, category);

    const kind = classifyKind(code, title);
    byCode.set(code, {
      code,
      title: title || '(χωρίς τίτλο)',
      moreUrl: pagePath ? `https://www.more.com${pagePath}` : null,
      morePathSlug,
      codeSlugRoot: evgCodeSlugRoot(code),
      kind,
      category,
    });
  }

  return [...byCode.values()];
}

/** Ευρετήριο slug → καταχωρήσεις καταλόγου (σελίδα More + ρίζα evg_ κωδικού). */
function buildCatalogSlugIndex(catalog) {
  const index = new Map();

  const add = (key, entry) => {
    const k = compactSlugKey(key);
    if (!k) return;
    const list = index.get(k) || [];
    if (!list.some((row) => row.code === entry.code)) list.push(entry);
    index.set(k, list);
  };

  for (const entry of catalog) {
    if (entry.morePathSlug) add(entry.morePathSlug, entry);
    if (entry.codeSlugRoot) add(entry.codeSlugRoot, entry);
    if (entry.code) add(evgCodeSlugRoot(entry.code), entry);
  }

  return index;
}

function cmsSlugLookupKeys(cms) {
  const keys = new Set();
  for (const raw of [cms.slug, cms.originalTitle, cms.title]) {
    const k = compactSlugKey(raw);
    if (k) keys.add(k);
  }
  return [...keys];
}

/**
 * Ταύτιση μέσω σελίδας More στον κατάλογο (όχι στη σελίδα λεπτομέρειας ταινίας).
 * Π.χ. CMS slug the-pout-pout-fish → /cinemas/the-pout-pout-fish/ → data-code evg_thepout-poutfish_…
 */
function scoreMatchByMorePagePath(cms, moreEntry) {
  const cmsKeys = cmsSlugLookupKeys(cms);
  if (!cmsKeys.length) return 0;

  const pathKey = compactSlugKey(moreEntry.morePathSlug);
  const codeKey = compactSlugKey(moreEntry.codeSlugRoot || evgCodeSlugRoot(moreEntry.code));

  for (const cmsKey of cmsKeys) {
    if (pathKey && cmsKey === pathKey) return 0.99;
    if (codeKey && (cmsKey === codeKey || cmsKey.includes(codeKey) || codeKey.includes(cmsKey))) {
      return 0.96;
    }
  }
  return 0;
}

function findCatalogByCmsSlug(cms, catalog, config) {
  const pool = catalog.filter((entry) => {
    if (entry.category !== config.moreCategory) return false;
    if (config.catalogKind) return entry.kind === config.catalogKind;
    if (config.moreCategory === 'cinema') return entry.kind === 'movie';
    return entry.kind === 'show';
  });
  const index = buildCatalogSlugIndex(pool);
  const seen = new Set();
  const hits = [];

  for (const key of cmsSlugLookupKeys(cms)) {
    for (const entry of index.get(key) || []) {
      if (seen.has(entry.code)) continue;
      seen.add(entry.code);
      hits.push({ more: entry, score: scoreMatchByMorePagePath(cms, entry) || 0.98 });
    }
  }

  return hits.sort((a, b) => b.score - a.score);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchMore(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.text();
  } catch (e) {
    throw formatMoreNetworkError(e, {
      url,
      timeoutMs: FETCH_TIMEOUT_MS,
      label: 'κατάλογος More',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextWithRetry(url) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchText(url);
    } catch (e) {
      lastErr = e;
      if (attempt === 0 && /timeout|aborted/i.test(String(e?.message || ''))) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function fetchMoreCatalog() {
  const [cinemaHtml, theaterHtml] = await Promise.all([
    fetchTextWithRetry(MORE_CINEMA_URL),
    fetchTextWithRetry(MORE_THEATER_URL),
  ]);

  const cinema = parseMoreCatalogHtml(cinemaHtml, {
    category: 'cinema',
    classifyKind: (code, title) => classifyCinemaCatalogKind(code, title),
  });
  const theater = parseMoreCatalogHtml(theaterHtml, {
    category: 'theater',
    classifyKind: () => 'show',
  });

  return [...cinema, ...theater].sort((a, b) => a.title.localeCompare(b.title, 'el'));
}

async function verifyEventGroupCodesParallel(codes, options = {}) {
  const concurrency = Number(options.concurrency ?? VERIFY_CONCURRENCY);
  const unique = [...new Set((codes || []).map((c) => String(c || '').trim()).filter(Boolean))];
  const map = new Map();
  if (!unique.length) return map;

  let cursor = 0;
  let done = 0;
  const onProgress = options.onProgress;

  async function worker() {
    while (cursor < unique.length) {
      const idx = cursor;
      cursor += 1;
      const code = unique[idx];
      if (!code || map.has(code)) continue;
      const verify = await verifyEventGroupCode(code);
      map.set(code, verify);
      done += 1;
      if (onProgress && (done === unique.length || done % 12 === 0)) {
        onProgress(`Επαλήθευση More API: ${done}/${unique.length}`);
      }
    }
  }

  const workers = Math.min(Math.max(1, concurrency), unique.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return map;
}

function moreEventsApiUrl(code) {
  return `${MORE_GETEVENTS}?eventGroupCode=${encodeURIComponent(String(code || '').trim())}`;
}

function truncateJsonPreview(value, maxLen = 720) {
  try {
    const sample = Array.isArray(value) ? value.slice(0, 2) : value;
    const s = JSON.stringify(sample);
    if (s.length <= maxLen) return s;
    return `${s.slice(0, maxLen)}…`;
  } catch {
    return '';
  }
}

async function verifyEventGroupCode(code) {
  const url = moreEventsApiUrl(code);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetchMore(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, apiUrl: url };
    const raw = await res.text();
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, error: 'κενή απάντηση More API', apiUrl: url };
    let events;
    try {
      events = JSON.parse(trimmed);
    } catch (e) {
      return {
        ok: false,
        error: e?.message || 'invalid JSON',
        apiUrl: url,
        jsonPreview: trimmed.slice(0, 720),
      };
    }
    if (!Array.isArray(events)) {
      return {
        ok: false,
        error: 'not array',
        apiUrl: url,
        jsonPreview: truncateJsonPreview(events),
      };
    }

    const venues = new Map();
    for (const ev of events) {
      const vid = String(ev.venueId ?? '');
      if (vid) venues.set(vid, ev.venueName || vid);
    }

    return {
      ok: true,
      apiUrl: url,
      eventCount: events.length,
      venueCount: venues.size,
      sampleVenues: [...venues.entries()].slice(0, 4).map(([id, name]) => ({ id, name })),
      sampleEventId: events[0]?.eventId ?? null,
      jsonPreview: truncateJsonPreview(events),
    };
  } catch (e) {
    const wrapped = formatMoreNetworkError(e, {
      url,
      timeoutMs: VERIFY_TIMEOUT_MS,
      label: 'More API verify',
    });
    return { ok: false, error: wrapped.message, apiUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

function scoreMatch(cmsMovie, moreEntry) {
  let best = scoreMatchByMorePagePath(cmsMovie, moreEntry);

  const candidates = [cmsMovie.title, cmsMovie.originalTitle, cmsMovie.slug].filter(Boolean);
  const moreTitle = moreEntry.title;
  const moreCompact = compactText(moreTitle);
  const slugPart = evgCodeSlugRoot(moreEntry.code);

  for (const c of candidates) {
    const nc = compactText(c);
    const nw = normalizeText(c);
    const nt = normalizeText(moreTitle);
    if (!nc || !nt) continue;

    if (nc === moreCompact || nw === nt) best = Math.max(best, 1);
    else if (moreCompact.includes(nc) || nc.includes(moreCompact)) {
      best = Math.max(best, 0.92);
    } else if (nt.includes(nw) || nw.includes(nt)) {
      best = Math.max(best, 0.85);
    } else {
      const words = nw.split(' ').filter((w) => w.length > 3);
      const hits = words.filter((w) => nt.includes(w)).length;
      if (words.length && hits >= Math.min(2, words.length)) {
        best = Math.max(best, 0.7 + (hits / words.length) * 0.15);
      }
    }

    const codeKey = compactSlugKey(slugPart);
    const cmsKey = compactSlugKey(c);
    if (codeKey && cmsKey && (cmsKey === codeKey || cmsKey.includes(codeKey) || codeKey.includes(cmsKey))) {
      best = Math.max(best, 0.96);
    }
  }
  return best;
}

function isRejectedMoreCode(cms, code) {
  const key = String(code || '').trim();
  if (!key) return false;
  return (cms.rejectedMoreCodes || []).includes(key);
}

function matchCmsItemsToMore(cmsItems, catalog, minScore = DEFAULT_MIN_SCORE) {
  const results = [];

  for (const cms of cmsItems) {
    const config = CMS_LOOKUP_CONFIG[cms.contentType];
    if (!config) continue;
    const pool = catalog.filter((entry) => {
      if (entry.category !== config.moreCategory) return false;
      if (config.catalogKind) return entry.kind === config.catalogKind;
      if (config.moreCategory === 'cinema') return entry.kind === 'movie';
      return entry.kind === 'show';
    });

    const scored = [];

    for (const hit of findCatalogByCmsSlug(cms, catalog, config)) {
      if (isRejectedMoreCode(cms, hit.more.code)) continue;
      if (hit.score < MIN_HINT_SCORE) continue;
      scored.push({ ...hit, matchMethod: 'more_page_slug' });
    }

    for (const more of pool) {
      if (isRejectedMoreCode(cms, more.code)) continue;
      const score = scoreMatch(cms, more);
      if (score >= MIN_HINT_SCORE) {
        scored.push({
          more,
          score,
          matchMethod: score >= 0.96 && more.morePathSlug ? 'more_page_slug' : 'title',
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const deduped = [];
    const seenCodes = new Set();
    for (const row of scored) {
      if (seenCodes.has(row.more.code)) continue;
      if (cmsHasEventGroupCode(cms, row.more.code)) continue;
      seenCodes.add(row.more.code);
      deduped.push(row);
    }

    const best = deduped[0] || null;
    const bestScore = best?.score || 0;
    const qualifying = deduped.filter((row) => row.score >= minScore);

    results.push({
      cms,
      more: best?.more ?? null,
      moreMatches: deduped.map((row) => ({
        moreTitle: row.more.title,
        suggestedEventGroupCode: row.more.code,
        moreUrl: row.more.moreUrl,
        morePathSlug: row.more.morePathSlug ?? null,
        moreCategory: row.more.category,
        score: Number(row.score.toFixed(3)),
        matchMethod: row.matchMethod ?? 'title',
      })),
      suggestedEventGroupCodes: qualifying.map((row) => row.more.code),
      score: bestScore,
      matched: qualifying.length > 0,
    });
  }

  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
}

/** Ταύτιση venue_bundle καταλόγου More ↔ χώροι σινεμά CMS. */
function matchVenueBundlesToCms(cmsVenues, catalog, minScore = DEFAULT_MIN_SCORE) {
  const config = CMS_LOOKUP_CONFIG.venue;
  const pool = catalog.filter((entry) => entry.kind === 'venue_bundle' && entry.category === 'cinema');
  const results = [];

  for (const cms of cmsVenues) {
    if (cms.venueType && cms.venueType !== 'cinema') continue;

    const scored = [];

    for (const hit of findCatalogByCmsSlug(cms, catalog, config)) {
      if (isRejectedMoreCode(cms, hit.more.code)) continue;
      if (hit.score < MIN_HINT_SCORE) continue;
      scored.push({ ...hit, matchMethod: 'more_page_slug' });
    }

    for (const more of pool) {
      if (isRejectedMoreCode(cms, more.code)) continue;
      const score = scoreMatch(cms, more);
      if (score >= MIN_HINT_SCORE) {
        scored.push({
          more,
          score,
          matchMethod: score >= 0.96 && more.morePathSlug ? 'more_page_slug' : 'title',
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const deduped = [];
    const seenCodes = new Set();
    for (const row of scored) {
      if (seenCodes.has(row.more.code)) continue;
      if (cmsHasEventGroupCode(cms, row.more.code)) continue;
      seenCodes.add(row.more.code);
      deduped.push(row);
    }

    const best = deduped[0] || null;
    const bestScore = best?.score || 0;
    const qualifying = deduped.filter((row) => row.score >= minScore);

    results.push({
      cms,
      more: best?.more ?? null,
      moreMatches: deduped.map((row) => ({
        moreTitle: row.more.title,
        suggestedEventGroupCode: row.more.code,
        moreUrl: row.more.moreUrl,
        morePathSlug: row.more.morePathSlug ?? null,
        moreCategory: row.more.category,
        score: Number(row.score.toFixed(3)),
        matchMethod: row.matchMethod ?? 'title',
      })),
      suggestedEventGroupCodes: qualifying.map((row) => row.more.code),
      score: bestScore,
      matched: qualifying.length > 0,
    });
  }

  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
}

/** Προτάσεις CMS χώρων για venue_bundle γραμμή καταλόγου που λείπει από CMS. */
function suggestCmsVenuesForCatalogBundle(catalogRow, cmsVenuesMapped, minScore = MIN_HINT_SCORE) {
  if (catalogRow?.kind !== 'venue_bundle') return [];
  const moreEntry = {
    title: catalogRow.moreTitle || catalogRow.title || '',
    code: catalogRow.eventGroupCode,
    moreUrl: catalogRow.moreUrl,
    category: catalogRow.category,
    codeSlugRoot: evgCodeSlugRoot(catalogRow.eventGroupCode),
  };
  const scored = [];
  for (const cms of cmsVenuesMapped || []) {
    if (catalogRow.category === 'cinema' && cms.venueType && cms.venueType !== 'cinema') continue;
    if (
      catalogRow.category === 'theater' &&
      cms.venueType &&
      cms.venueType !== 'theater' &&
      cms.venueType !== 'other'
    ) {
      continue;
    }
    if (isRejectedMoreCode(cms, catalogRow.eventGroupCode)) continue;
    if (cmsHasEventGroupCode(cms, catalogRow.eventGroupCode)) continue;
    const score = scoreMatch(
      { title: cms.title, slug: cms.slug, originalTitle: '' },
      moreEntry,
    );
    if (score >= MIN_HINT_SCORE) {
      scored.push({
        cmsId: cms.id,
        cmsTitle: cms.title,
        score: Number(score.toFixed(3)),
        venueType: cms.venueType,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const qualifying = scored.filter((row) => row.score >= minScore);
  return (qualifying.length ? qualifying : scored).slice(0, 6);
}

function buildSuggestedVenueCreatePayload(catalogRow) {
  const verify = catalogRow.verify;
  const sample = verify?.sampleVenues?.[0];
  const name =
    String(catalogRow.name || catalogRow.moreTitle || sample?.name || '').trim() || 'Σινεμά More';
  const type =
    catalogRow.type === 'theater' || catalogRow.type === 'cinema' || catalogRow.type === 'other'
      ? catalogRow.type
      : catalogRow.category === 'theater'
        ? 'theater'
        : 'cinema';
  return {
    name,
    type,
    more_link: catalogRow.moreUrl || null,
    venue_id: catalogRow.venueId != null ? String(catalogRow.venueId) : sample?.id ? String(sample.id) : null,
    event_group_code: catalogRow.eventGroupCode,
    summer_outdoor: /θεριν|therino|summer/i.test(name),
  };
}

/**
 * Ρητή σύνδεση More κωδικού → CMS εγγραφή (more_code_links) + προαιρετική ουρά έγκρισης.
 */
async function linkMoreCodeToCms(strapi, options = {}) {
  const contentType =
    options.contentType ||
    (options.venueId != null ? 'venue' : options.theaterShowId != null ? 'theater_show' : 'movie');
  const cmsId = Number(
    options.cmsId ?? options.venueId ?? options.theaterShowId ?? options.movieId,
  );
  const code = String(options.eventGroupCode || '').trim();
  const catalogKind = String(options.catalogKind || catalogKindForCatalogEntry(options) || 'venue_bundle');
  const moreTitle = String(options.moreTitle || '').trim();
  const queueApproval = options.queueApproval !== false;

  if (!Number.isFinite(cmsId) || !code) {
    throw new Error('Απαιτούνται cmsId και eventGroupCode');
  }

  const config = CMS_LOOKUP_CONFIG[contentType];
  if (!config) throw new Error(`Άγνωστος τύπος CMS: ${contentType}`);

  const entry = await strapi.entityService.findOne(config.uid, cmsId, {
    fields: ['id', contentType === 'venue' ? 'name' : 'title'],
    populate: { more_code_links: true },
    publicationState: 'preview',
  });
  if (!entry) throw new Error(`Δεν βρέθηκε ${contentType} #${cmsId}`);

  const existing = moreCodeLinksPayloadFromRaw(entry);
  const hasLink = existing.some((link) => link.code === code);
  if (!hasLink) {
    existing.push({
      code,
      catalog_kind: catalogKind,
      more_title: moreTitle || undefined,
    });
    await strapi.entityService.update(config.uid, cmsId, {
      data: { more_code_links: existing },
    });
  }

  let approval = null;
  if (queueApproval) {
    approval = await approveMoreEventGroupCode(strapi, {
      contentType,
      cmsId,
      movieId: options.movieId,
      theaterShowId: options.theaterShowId,
      venueId: options.venueId,
      eventGroupCode: code,
      overwriteExisting: options.overwriteExisting === true,
    });
  }

  return {
    ok: true,
    linked: !hasLink,
    alreadyLinked: hasLink,
    contentType,
    cmsId,
    eventGroupCode: code,
    catalogKind,
    approval,
  };
}

/** Δημιουργία draft χώρου από γραμμή καταλόγου More + σύνδεση κωδικού. */
async function createVenueFromMoreCatalog(strapi, options = {}) {
  const code = String(options.eventGroupCode || '').trim();
  if (!code) throw new Error('Απαιτείται eventGroupCode');

  const category = options.category || 'cinema';
  const catalogRow = {
    name: options.name || '',
    moreTitle: options.moreTitle || '',
    moreUrl: options.moreUrl || '',
    eventGroupCode: code,
    category,
    type: options.type,
    venueId: options.venueId,
    verify: options.verify || null,
  };
  const draft = buildSuggestedVenueCreatePayload(catalogRow);
  if (!draft.name?.trim()) throw new Error('Απαιτείται όνομα χώρου');

  const catalogKind =
    options.catalogKind ||
    (category === 'theater' ? 'theater_venue' : 'venue_bundle');
  const slug = await uniqueVenueSlugForLookup(strapi, draft.name);

  const created = await strapi.entityService.create('api::venue.venue', {
    data: {
      ...draft,
      slug,
      publishedAt: options.publish === true ? new Date() : null,
      info: 'Δημιουργία από More lookup (draft).',
      more_code_links: [
        {
          code,
          catalog_kind: catalogKind,
          more_title: catalogRow.moreTitle || draft.name,
        },
      ],
    },
  });

  const approval = await approveMoreEventGroupCode(strapi, {
    contentType: 'venue',
    cmsId: created.id,
    venueId: created.id,
    eventGroupCode: code,
  });

  return {
    ok: true,
    venue: {
      id: created.id,
      name: created.name,
      slug: created.slug,
      type: created.type,
      venue_id: created.venue_id,
    },
    catalogKind,
    approval,
  };
}

function mapRawMatchToResult(row, verified, applyMinScore) {
  const cms = row.cms;
  const contentType = cms.contentType || 'movie';
  const suggestedCode = row.more?.code ?? null;
  const suggestedCodes = row.suggestedEventGroupCodes || (suggestedCode ? [suggestedCode] : []);
  const verify = suggestedCode ? verified.get(suggestedCode) ?? null : null;
  const moreMatches = (row.moreMatches || []).map((match) => ({
    ...match,
    verify: match.suggestedEventGroupCode
      ? verified.get(match.suggestedEventGroupCode) ?? null
      : null,
  }));
  const cmsCodes = cms.eventGroupCodes || [];
  const cmsCode = cms.eventGroupCode || cmsCodes[0] || null;
  const hasSuggested = cmsHasEventGroupCode(cms, suggestedCode);

  return {
    contentType,
    cmsId: cms.id,
    ...cmsIdRefs(contentType, cms.id),
    cmsTitle: cms.title,
    cmsOriginalTitle: cms.originalTitle || '',
    cmsSlug: cms.slug ?? '',
    cmsEventGroupCode: cmsCode,
    cmsEventGroupCodes: cmsCodes,
    cmsRejectedMoreCodes: cms.rejectedMoreCodes || [],
    cmsApprovedMoreCodes: cms.approvedMoreCodes || [],
    moreTitle: row.more?.title ?? null,
    suggestedEventGroupCode: suggestedCode,
    suggestedEventGroupCodes: suggestedCodes,
    moreMatches,
    moreUrl: row.more?.moreUrl ?? null,
    moreCategory: row.more?.category ?? null,
    score: Number((row.score || 0).toFixed(3)),
    matched: Boolean(row.matched),
    needsApproval: needsApproval(
      {
        suggestedEventGroupCode: suggestedCode,
        score: row.score,
        eventGroupCodes: cmsCodes,
      },
      applyMinScore,
    ),
    conflict: Boolean(cmsCodes.length && suggestedCode && !hasSuggested),
    verify,
  };
}

/** @deprecated χρήση matchCmsItemsToMore */
function matchMoviesToMore(cmsMovies, moreMovies, minScore = DEFAULT_MIN_SCORE) {
  const catalog = moreMovies.map((entry) => ({
    ...entry,
    category: entry.category || 'cinema',
    kind: entry.kind || 'movie',
  }));
  const cmsItems = cmsMovies.map((cms) => ({
    ...cms,
    contentType: cms.contentType || 'movie',
  }));
  return matchCmsItemsToMore(cmsItems, catalog, minScore);
}

function filterMoreCatalog(entries, query) {
  if (!query?.trim()) return entries;
  const nq = normalizeText(query);
  return entries.filter(
    (e) =>
      normalizeText(e.title).includes(nq) ||
      normalizeText(e.code).includes(nq.replace(/\s+/g, '')) ||
      compactText(e.title).includes(compactText(query)),
  );
}

/** @deprecated */
function filterMoreMovies(movies, query) {
  return filterMoreCatalog(movies, query);
}

function collectRejectedMoreCodes(entry) {
  return (entry?.rejected_more_codes || [])
    .map((group) => String(group?.code || '').trim())
    .filter(Boolean);
}

function collectApprovedMoreCodes(entry) {
  return (entry?.approved_more_codes || [])
    .map((group) => String(group?.code || '').trim())
    .filter(Boolean);
}

function rejectedGroupsFromEntry(entry) {
  return (entry?.rejected_more_codes || [])
    .map((group) => {
      const code = String(group.code || '').trim();
      if (!code) return null;
      const item = { code };
      if (group.id != null) item.id = group.id;
      return item;
    })
    .filter(Boolean);
}

function approvedGroupsFromEntry(entry) {
  return (entry?.approved_more_codes || [])
    .map((group) => {
      const code = String(group.code || '').trim();
      if (!code) return null;
      const item = { code };
      if (group.id != null) item.id = group.id;
      return item;
    })
    .filter(Boolean);
}

function collectMoreCodeLinksFromRaw(row) {
  const groups = row?.more_code_links ?? row?.moreCodeLinks ?? [];
  const list = Array.isArray(groups) ? groups : [];
  return list
    .map((group) => ({
      code: String(group?.code ?? group?.attributes?.code ?? '').trim(),
      catalogKind: String(group?.catalog_kind ?? group?.catalogKind ?? '').trim(),
      moreTitle: String(group?.more_title ?? group?.moreTitle ?? '').trim(),
    }))
    .filter((link) => link.code && link.catalogKind);
}

function moreCodeLinksPayloadFromRaw(row) {
  return collectMoreCodeLinksFromRaw(row).map((link) => ({
    code: link.code,
    catalog_kind: link.catalogKind,
    more_title: link.moreTitle || undefined,
  }));
}

function catalogKindForCatalogEntry(entry) {
  if (entry?.kind === 'venue_bundle') {
    return entry?.category === 'theater' ? 'theater_venue' : 'venue_bundle';
  }
  if (entry?.kind === 'show' && entry?.category === 'theater') return 'show';
  if (entry?.kind === 'movie') return 'movie';
  return entry?.kind || 'movie';
}

function mapCmsLookupRow(row, contentType) {
  const eventGroupCodes = collectEventGroupCodes(row);
  return {
    contentType,
    id: row.id,
    title: row.title ?? '',
    originalTitle: contentType === 'movie' ? (row.original_title ?? '') : '',
    slug: row.slug ?? '',
    eventGroupCode: row.event_group_code ?? '',
    eventGroupCodes,
    rejectedMoreCodes: collectRejectedMoreCodes(row),
    approvedMoreCodes: collectApprovedMoreCodes(row),
    pendingEventGroupCode: row.pending_event_group_code ?? '',
    pendingMoreTitle: row.pending_more_title ?? '',
    pendingMatchScore: row.pending_match_score ?? null,
    moreCodeLinks: collectMoreCodeLinksFromRaw(row),
  };
}

async function loadCmsMovies(strapi) {
  const rows = await strapi.entityService.findMany('api::movie.movie', {
    fields: [
      'id',
      'title',
      'original_title',
      'slug',
      'event_group_code',
      'pending_event_group_code',
      'pending_more_title',
      'pending_match_score',
    ],
    populate: { more_event_groups: true, rejected_more_codes: true, approved_more_codes: true, more_code_links: true },
    publicationState: 'preview',
    pagination: { pageSize: 500 },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => mapCmsLookupRow(row, 'movie'));
}

async function loadCmsTheaterShows(strapi) {
  const rows = await strapi.entityService.findMany('api::theater-show.theater-show', {
    fields: [
      'id',
      'title',
      'slug',
      'event_group_code',
      'pending_event_group_code',
      'pending_more_title',
      'pending_match_score',
    ],
    populate: { more_event_groups: true, rejected_more_codes: true, approved_more_codes: true, more_code_links: true },
    publicationState: 'preview',
    pagination: { pageSize: 500 },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => mapCmsLookupRow(row, 'theater_show'));
}

async function loadAllCmsItems(strapi) {
  const [movies, theaterShows] = await Promise.all([
    loadCmsMovies(strapi),
    loadCmsTheaterShows(strapi),
  ]);
  return [...movies, ...theaterShows];
}

async function loadCmsVenues(strapi) {
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    fields: [
      'id',
      'name',
      'slug',
      'type',
      'venue_id',
      'event_group_code',
      'more_link',
      'pending_event_group_code',
      'pending_more_title',
      'pending_match_score',
    ],
    populate: { more_event_groups: true, rejected_more_codes: true, approved_more_codes: true, more_code_links: true },
    publicationState: 'preview',
    pagination: { pageSize: 500 },
  });
  return Array.isArray(rows) ? rows : [];
}

const GREEK_TO_LATIN_VENUE = {
  α: 'a', ά: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', έ: 'e', ζ: 'z', η: 'i', ή: 'i',
  θ: 'th', ι: 'i', ί: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', ό: 'o',
  π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', ύ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o', ώ: 'o',
};

function slugifyVenueNameForLookup(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => GREEK_TO_LATIN_VENUE[ch] ?? GREEK_TO_LATIN_VENUE[ch.toLowerCase()] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function uniqueVenueSlugForLookup(strapi, name) {
  const base = slugifyVenueNameForLookup(name) || 'venue';
  for (let n = 0; n < 20; n += 1) {
    const slug = n === 0 ? base : `${base}-${n + 1}`;
    const rows = await strapi.entityService.findMany('api::venue.venue', {
      filters: { slug },
      fields: ['id'],
      publicationState: 'preview',
      limit: 1,
    });
    if (!Array.isArray(rows) || !rows.length) return slug;
  }
  return `${base}-${Date.now()}`;
}

function buildCmsVenueByMoreIdIndex(cmsVenues) {
  const byMoreId = new Map();
  for (const venue of cmsVenues || []) {
    for (const key of moreVenueIdLookupKeys(venue?.venue_id ?? venue?.venueId)) {
      if (!byMoreId.has(key)) byMoreId.set(key, venue);
    }
  }
  return byMoreId;
}

function collectMoreVenueIdsFromVerify(verify) {
  if (!verify?.ok) return [];
  const ids = [];
  for (const row of verify.sampleVenues || []) {
    const id = normalizeMoreVenueId(row?.id);
    if (id) ids.push(id);
  }
  return ids;
}

function findCmsVenueByMoreId(moreVenueId, cmsVenueByMoreId) {
  if (!cmsVenueByMoreId?.size) return null;
  for (const key of moreVenueIdLookupKeys(moreVenueId)) {
    const hit = cmsVenueByMoreId.get(key);
    if (hit) return hit;
  }
  return null;
}

function mapCmsVenueLookupRow(row) {
  const eventGroupCodes = collectVenueBundleCodes(row);
  return {
    contentType: 'venue',
    id: row.id,
    title: row.name ?? '',
    originalTitle: '',
    slug: row.slug ?? '',
    venueType: row.type ?? 'cinema',
    moreVenueId: normalizeMoreVenueId(row?.venue_id ?? row?.venueId) || null,
    eventGroupCode: row.event_group_code ?? '',
    eventGroupCodes,
    rejectedMoreCodes: collectRejectedMoreCodes(row),
    approvedMoreCodes: collectApprovedMoreCodes(row),
    pendingEventGroupCode: row.pending_event_group_code ?? '',
    pendingMoreTitle: row.pending_more_title ?? '',
    pendingMatchScore: row.pending_match_score ?? null,
  };
}

async function loadCmsVenuesForLookup(strapi) {
  const rows = await loadCmsVenues(strapi);
  return rows.map(mapCmsVenueLookupRow);
}

function collectVenueMoreCodes(venue) {
  const codes = new Set();
  const add = (raw) => {
    const code = String(raw || '').trim();
    if (code && /^evg_/i.test(code)) codes.add(code);
  };

  for (const code of collectVenueBundleCodes(venue)) add(code);
  for (const code of collectTheaterVenueBundleCodes(venue)) add(code);

  add(venue?.event_group_code ?? venue?.eventGroupCode);

  const groups = venue?.more_event_groups ?? venue?.moreEventGroups ?? [];
  for (const group of groups) {
    add(group?.code ?? group?.attributes?.code);
  }

  add(extractEvgCodeFromText(venue?.more_link ?? venue?.moreLink));
  return [...codes];
}

function buildCmsEventGroupCodeIndex(cmsItems, cmsVenues) {
  const byCode = new Map();

  const add = (code, ref) => {
    const key = String(code || '').trim();
    if (!key) return;
    if (!byCode.has(key)) byCode.set(key, []);
    byCode.get(key).push(ref);
  };

  for (const item of cmsItems) {
    for (const code of resolveEventGroupCodesFromEntry(item)) {
      add(code, {
        contentType: item.contentType,
        cmsId: item.id,
        cmsTitle: item.title,
        inCms: true,
      });
    }
    const pending = String(item.pendingEventGroupCode || '').trim();
    if (pending) {
      add(pending, {
        contentType: item.contentType,
        cmsId: item.id,
        cmsTitle: item.title,
        pending: true,
        inCms: false,
      });
    }
    for (const link of item.moreCodeLinks || []) {
      add(link.code, {
        contentType: item.contentType,
        cmsId: item.id,
        cmsTitle: item.title,
        inCms: true,
        catalogKindHint: link.catalogKind,
        linkedManually: true,
      });
    }
  }

  for (const venue of cmsVenues) {
    for (const code of collectVenueMoreCodes(venue)) {
      add(code, {
        contentType: 'venue',
        cmsId: venue.id,
        cmsTitle: venue.name,
        venueType: venue.type,
        inCms: true,
      });
    }
    for (const link of collectMoreCodeLinksFromRaw(venue)) {
      add(link.code, {
        contentType: 'venue',
        cmsId: venue.id,
        cmsTitle: venue.name,
        venueType: venue.type,
        inCms: true,
        catalogKindHint: link.catalogKind,
        linkedManually: true,
      });
    }
    const pending = String(venue.pending_event_group_code || '').trim();
    if (pending) {
      add(pending, {
        contentType: 'venue',
        cmsId: venue.id,
        cmsTitle: venue.name,
        venueType: venue.type,
        pending: true,
        inCms: false,
      });
    }
  }

  return byCode;
}

/**
 * Ποια CMS εγγραφή μετράει ανά γραμμή καταλόγου More.
 * Σινεμά (venue_bundle) → μόνο χώροι τύπου cinema · ταινίες → movie · θέατρο → theater_show.
 */
function filterCmsRefsForCatalogEntry(entry, refs) {
  if (!Array.isArray(refs) || !refs.length) return [];
  const expectedKind = catalogKindForCatalogEntry(entry);

  const manual = refs.filter(
    (ref) => ref.catalogKindHint === expectedKind && ref.inCms !== false && !ref.pending,
  );
  if (manual.length) return manual;

  if (entry.kind === 'venue_bundle') {
    return refs.filter((ref) => {
      if (ref.contentType !== 'venue' || !ref.inCms) return false;
      if (entry.category === 'cinema') {
        return !ref.venueType || ref.venueType === 'cinema';
      }
      if (entry.category === 'theater') {
        return ref.venueType === 'theater' || ref.venueType === 'other';
      }
      return true;
    });
  }

  if (entry.kind === 'show' && entry.category === 'theater') {
    return refs.filter((ref) => ref.contentType === 'theater_show' && ref.inCms);
  }

  if (entry.kind === 'movie' && entry.category === 'cinema') {
    return refs.filter((ref) => ref.contentType === 'movie' && ref.inCms);
  }

  return refs.filter((ref) => ref.inCms);
}

function annotateCatalogWithCmsStatus(entries, cmsCodeIndex, cmsVenueByMoreId) {
  return entries.map((entry) => {
    const allRefs = cmsCodeIndex.get(entry.eventGroupCode) || [];
    let cmsRefs = filterCmsRefsForCatalogEntry(entry, allRefs);
    const pendingRefs = (() => {
      if (entry.kind === 'venue_bundle') {
        return allRefs.filter((ref) => ref.pending && ref.contentType === 'venue');
      }
      if (entry.kind === 'show' && entry.category === 'theater') {
        return allRefs.filter((ref) => ref.pending && ref.contentType === 'theater_show');
      }
      if (entry.kind === 'movie' && entry.category === 'cinema') {
        return allRefs.filter((ref) => ref.pending && ref.contentType === 'movie');
      }
      return allRefs.filter((ref) => ref.pending);
    })();
    let inCms = cmsRefs.length > 0;

    // venue_bundle: αν λείπει κωδικός αλλά υπάρχει χώρος CMS με ίδιο More venueId → in_cms.
    if (!inCms && entry.kind === 'venue_bundle' && cmsVenueByMoreId?.size) {
      for (const moreId of collectMoreVenueIdsFromVerify(entry.verify)) {
        const venue = findCmsVenueByMoreId(moreId, cmsVenueByMoreId);
        if (!venue) continue;
        if (entry.category === 'cinema' && venue.type && venue.type !== 'cinema') continue;
        if (
          entry.category === 'theater' &&
          venue.type &&
          venue.type !== 'theater' &&
          venue.type !== 'other'
        ) {
          continue;
        }
        inCms = true;
        cmsRefs = [
          {
            contentType: 'venue',
            cmsId: venue.id,
            cmsTitle: venue.name,
            venueType: venue.type,
            inCms: true,
            matchedBy: 'venue_id',
            moreVenueId: normalizeMoreVenueId(venue.venue_id),
          },
        ];
        break;
      }
    }

    const pendingOnly = !inCms && pendingRefs.length > 0;
    return {
      ...entry,
      inCms,
      cmsRefs,
      cmsStatus: inCms ? 'in_cms' : pendingOnly ? 'pending' : 'missing',
    };
  });
}

function cmsHasEventGroupCode(cms, code) {
  if (!code) return false;
  const codes = cms.eventGroupCodes?.length
    ? cms.eventGroupCodes
    : cms.contentType === 'venue'
      ? collectVenueBundleCodes(cms)
      : resolveEventGroupCodesFromEntry(cms);
  return codes.includes(code);
}

/** @deprecated */
function movieHasEventGroupCode(cms, code) {
  return cmsHasEventGroupCode(cms, code);
}

function needsApproval(row, applyMinScore = DEFAULT_APPLY_MIN_SCORE) {
  if (!row.suggestedEventGroupCode) return false;
  if (row.score >= applyMinScore) return false;
  if (cmsHasEventGroupCode(row, row.suggestedEventGroupCode)) return false;
  return true;
}

async function clearCmsPending(strapi, contentType, cmsId) {
  const config = CMS_LOOKUP_CONFIG[contentType];
  if (!config) return;
  await strapi.entityService.update(config.uid, cmsId, {
    data: {
      pending_event_group_code: null,
      pending_more_title: null,
      pending_match_score: null,
    },
  });
}

/** @deprecated */
async function clearMoviePending(strapi, movieId) {
  await clearCmsPending(strapi, 'movie', movieId);
}

function moreGroupsFromEntry(entry) {
  return (entry?.more_event_groups || [])
    .map((group) => {
      const code = String(group.code || '').trim();
      if (!code) return null;
      const item = { code };
      if (group.id != null) item.id = group.id;
      return item;
    })
    .filter(Boolean);
}

/** Κωδικοί προς εφαρμογή (σειρά score) από αποτέλεσμα ταύτισης. */
function selectApplyCodesFromMatch(row, applyMinScore = DEFAULT_APPLY_MIN_SCORE) {
  const matchesByCode = new Map(
    (row.moreMatches || []).map((match) => [match.suggestedEventGroupCode, match]),
  );
  const orderedCodes =
    row.suggestedEventGroupCodes?.length > 0
      ? row.suggestedEventGroupCodes
      : row.suggestedEventGroupCode
        ? [row.suggestedEventGroupCode]
        : [];

  return orderedCodes
    .map((code) => matchesByCode.get(code))
    .filter(Boolean)
    .filter((match) => Number(match.score) >= applyMinScore);
}

/**
 * Προσθήκη ενός ή περισσότερων event_group_code σε ταινία/παράσταση.
 * Κενό primary → πρώτος κωδικός primary, υπόλοιποι σε more_event_groups.
 */
async function mergeEventGroupCodesIntoCms(strapi, contentType, entry, codes, options = {}) {
  const config = CMS_LOOKUP_CONFIG[contentType];
  if (!config) throw new Error(`Άγνωστος τύπος CMS: ${contentType}`);

  const overwriteExisting = options.overwriteExisting === true;
  const existingCodes =
    contentType === 'venue' ? collectVenueBundleCodes(entry) : collectEventGroupCodes(entry);
  const incoming = [...new Set((codes || []).map((code) => String(code || '').trim()).filter(Boolean))];
  const toAdd = incoming.filter((code) => !existingCodes.includes(code));
  if (!toAdd.length) {
    return { added: [], primary: String(entry.event_group_code || '').trim() || null, alreadyPresent: true };
  }

  const primary = String(entry.event_group_code || '').trim();
  const data = {};

  if (!primary) {
    data.event_group_code = toAdd[0];
    const rest = toAdd.slice(1);
    if (rest.length) {
      data.more_event_groups = [...moreGroupsFromEntry(entry), ...rest.map((code) => ({ code }))];
    }
  } else if (overwriteExisting && toAdd.length === 1 && incoming.length === 1) {
    data.event_group_code = toAdd[0];
  } else {
    const moreGroups = moreGroupsFromEntry(entry);
    for (const code of toAdd) {
      moreGroups.push({ code });
    }
    data.more_event_groups = moreGroups;
  }

  if (contentType === 'theater_show' || contentType === 'movie' || contentType === 'venue') {
    data.pending_event_group_code = null;
    data.pending_more_title = null;
    data.pending_match_score = null;
  }

  await strapi.entityService.update(config.uid, entry.id, { data });

  return {
    added: toAdd,
    primary: data.event_group_code || primary || null,
    addedAsSecondary: Boolean(primary && !data.event_group_code),
  };
}

async function syncPendingApprovals(strapi, matches, applyMinScore = DEFAULT_APPLY_MIN_SCORE) {
  const pendingIds = new Set();
  for (const row of matches) {
    const contentType = row.contentType || 'movie';
    const cmsId = row.cmsId ?? row.movieId ?? row.theaterShowId ?? row.venueId;
    if (!cmsId) continue;

    if (needsApproval(row, applyMinScore)) {
      pendingIds.add(`${contentType}:${cmsId}`);
      await strapi.entityService.update(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
        data: {
          pending_event_group_code: row.suggestedEventGroupCode,
          pending_more_title: row.moreTitle || null,
          pending_match_score: row.score,
        },
      });
    } else if (row.cmsEventGroupCode || row.score >= applyMinScore) {
      await clearCmsPending(strapi, contentType, cmsId);
    }
  }
  return pendingIds.size;
}

async function loadPendingApprovalItems(strapi) {
  const [movies, theaterShows, venues] = await Promise.all([
    strapi.entityService.findMany('api::movie.movie', {
      filters: { pending_event_group_code: { $notNull: true } },
      fields: [
        'id',
        'title',
        'slug',
        'event_group_code',
        'pending_event_group_code',
        'pending_more_title',
        'pending_match_score',
      ],
      publicationState: 'preview',
      pagination: { pageSize: 200 },
      sort: ['title:asc'],
    }),
    strapi.entityService.findMany('api::theater-show.theater-show', {
      filters: { pending_event_group_code: { $notNull: true } },
      fields: [
        'id',
        'title',
        'slug',
        'event_group_code',
        'pending_event_group_code',
        'pending_more_title',
        'pending_match_score',
      ],
      publicationState: 'preview',
      pagination: { pageSize: 200 },
      sort: ['title:asc'],
    }),
    strapi.entityService.findMany('api::venue.venue', {
      filters: { pending_event_group_code: { $notNull: true } },
      fields: [
        'id',
        'name',
        'slug',
        'event_group_code',
        'pending_event_group_code',
        'pending_more_title',
        'pending_match_score',
      ],
      publicationState: 'preview',
      pagination: { pageSize: 200 },
      sort: ['name:asc'],
    }),
  ]);

  const mapPending = (rows, contentType) =>
    (Array.isArray(rows) ? rows : [])
      .filter((m) => String(m.pending_event_group_code || '').trim())
      .map((m) => ({
        contentType,
        cmsId: m.id,
        ...cmsIdRefs(contentType, m.id),
        cmsTitle: cmsEntryTitle(m, contentType),
        cmsOriginalTitle: '',
        cmsSlug: m.slug ?? '',
        cmsEventGroupCode: m.event_group_code || null,
        suggestedEventGroupCode: String(m.pending_event_group_code).trim(),
        moreTitle: m.pending_more_title || null,
        score: Number(m.pending_match_score) || 0,
      }));

  return [
    ...mapPending(movies, 'movie'),
    ...mapPending(theaterShows, 'theater_show'),
    ...mapPending(venues, 'venue'),
  ].sort((a, b) => a.cmsTitle.localeCompare(b.cmsTitle, 'el'));
}

/** @deprecated */
async function loadPendingApprovalMovies(strapi) {
  return loadPendingApprovalItems(strapi);
}

/**
 * Απόρριψη προτεινόμενου κωδικού — αποθηκεύεται στη λίστα απορριφθέντων.
 */
async function rejectMoreEventGroupCode(strapi, options = {}) {
  const contentType =
    options.contentType ||
    (options.venueId != null ? 'venue' : options.theaterShowId != null ? 'theater_show' : 'movie');
  const config = CMS_LOOKUP_CONFIG[contentType];
  if (!config) throw new Error(`Άγνωστος τύπος CMS: ${contentType}`);

  const id = Number(options.cmsId ?? options.movieId ?? options.theaterShowId ?? options.venueId);
  if (!Number.isFinite(id)) {
    throw new Error('Άκυρο cmsId');
  }

  const code = String(options.eventGroupCode || '').trim();
  if (!code) throw new Error('Απαιτείται eventGroupCode');

  const titleFields = contentType === 'venue' ? ['id', 'name', 'pending_event_group_code'] : ['id', 'title', 'pending_event_group_code'];
  const entry = await strapi.entityService.findOne(config.uid, id, {
    fields: titleFields,
    populate: { rejected_more_codes: true, approved_more_codes: true },
    publicationState: 'preview',
  });
  if (!entry) {
    const label =
      contentType === 'movie' ? 'Η ταινία' : contentType === 'venue' ? 'Ο χώρος' : 'Η παράσταση';
    throw new Error(`${label} δεν βρέθηκε`);
  }

  const rejected = rejectedGroupsFromEntry(entry);
  if (!rejected.some((group) => group.code === code)) {
    rejected.push({ code });
  }

  const approved = approvedGroupsFromEntry(entry).filter((group) => group.code !== code);

  const data = {
    rejected_more_codes: rejected,
    approved_more_codes: approved,
  };
  const pending = String(entry.pending_event_group_code || '').trim();
  if (pending === code) {
    data.pending_event_group_code = null;
    data.pending_more_title = null;
    data.pending_match_score = null;
  }

  await strapi.entityService.update(config.uid, id, { data });

  return {
    ok: true,
    contentType,
    cmsId: id,
    ...cmsIdRefs(contentType, id),
    cmsTitle: cmsEntryTitle(entry, contentType),
    eventGroupCode: code,
  };
}

/**
 * Έγκριση προτεινόμενου κωδικού → ουρά για «Γράψε αυτόματα» (χωρίς άμεση εγγραφή CMS).
 */
async function queueApproveMoreEventGroupCode(strapi, options = {}) {
  const contentType =
    options.contentType ||
    (options.venueId != null ? 'venue' : options.theaterShowId != null ? 'theater_show' : 'movie');
  const config = CMS_LOOKUP_CONFIG[contentType];
  if (!config) throw new Error(`Άγνωστος τύπος CMS: ${contentType}`);

  const id = Number(options.cmsId ?? options.movieId ?? options.theaterShowId ?? options.venueId);
  if (!Number.isFinite(id)) {
    throw new Error('Άκυρο cmsId');
  }

  const code = String(
    options.eventGroupCode || options.pending_event_group_code || '',
  ).trim();
  if (!code) throw new Error('Λείπει event_group_code προς έγκριση');

  const titleFields =
    contentType === 'venue'
      ? ['id', 'name', 'event_group_code', 'pending_event_group_code']
      : ['id', 'title', 'event_group_code', 'pending_event_group_code'];
  const entry = await strapi.entityService.findOne(config.uid, id, {
    fields: titleFields,
    populate: { more_event_groups: true, rejected_more_codes: true, approved_more_codes: true },
    publicationState: 'preview',
  });
  if (!entry) {
    const label =
      contentType === 'movie' ? 'Η ταινία' : contentType === 'venue' ? 'Ο χώρος' : 'Η παράσταση';
    throw new Error(`${label} δεν βρέθηκε`);
  }

  if (collectRejectedMoreCodes(entry).includes(code)) {
    throw new Error('Ο κωδικός έχει απορριφθεί');
  }

  const existingCodes =
    contentType === 'venue' ? collectVenueBundleCodes(entry) : collectEventGroupCodes(entry);
  if (existingCodes.includes(code)) {
    const approvedOnly = approvedGroupsFromEntry(entry).filter((group) => group.code !== code);
    await strapi.entityService.update(config.uid, id, {
      data: { approved_more_codes: approvedOnly },
    });
    await clearCmsPending(strapi, contentType, id);
    return {
      ok: true,
      contentType,
      cmsId: id,
      ...cmsIdRefs(contentType, id),
      cmsTitle: cmsEntryTitle(entry, contentType),
      eventGroupCode: code,
      alreadyPresent: true,
      queued: false,
    };
  }

  const approved = approvedGroupsFromEntry(entry);
  if (!approved.some((group) => group.code === code)) {
    approved.push({ code });
  }

  const data = { approved_more_codes: approved };
  const pending = String(entry.pending_event_group_code || '').trim();
  if (pending === code) {
    data.pending_event_group_code = null;
    data.pending_more_title = null;
    data.pending_match_score = null;
  }

  await strapi.entityService.update(config.uid, id, { data });

  return {
    ok: true,
    contentType,
    cmsId: id,
    ...cmsIdRefs(contentType, id),
    cmsTitle: cmsEntryTitle(entry, contentType),
    eventGroupCode: code,
    queued: true,
  };
}

async function approveMoreEventGroupCode(strapi, options = {}) {
  return queueApproveMoreEventGroupCode(strapi, options);
}

async function loadApprovedQueueItems(strapi) {
  const [movies, theaterShows, venues] = await Promise.all([
    strapi.entityService.findMany('api::movie.movie', {
      filters: { approved_more_codes: { $notNull: true } },
      fields: ['id', 'title', 'slug', 'event_group_code'],
      populate: { more_event_groups: true, approved_more_codes: true },
      publicationState: 'preview',
      pagination: { pageSize: 500 },
    }),
    strapi.entityService.findMany('api::theater-show.theater-show', {
      filters: { approved_more_codes: { $notNull: true } },
      fields: ['id', 'title', 'slug', 'event_group_code'],
      populate: { more_event_groups: true, approved_more_codes: true },
      publicationState: 'preview',
      pagination: { pageSize: 500 },
    }),
    strapi.entityService.findMany('api::venue.venue', {
      filters: { approved_more_codes: { $notNull: true } },
      fields: ['id', 'name', 'slug', 'event_group_code', 'type'],
      populate: { more_event_groups: true, approved_more_codes: true },
      publicationState: 'preview',
      pagination: { pageSize: 500 },
    }),
  ]);

  const mapQueue = (rows, contentType) =>
    (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const existingCodes =
          contentType === 'venue' ? collectVenueBundleCodes(row) : collectEventGroupCodes(row);
        const codes = collectApprovedMoreCodes(row).filter((code) => !existingCodes.includes(code));
        if (!codes.length) return null;
        return {
          contentType,
          cmsId: row.id,
          ...cmsIdRefs(contentType, row.id),
          cmsTitle: cmsEntryTitle(row, contentType),
          cmsSlug: row.slug ?? '',
          cmsEventGroupCode: row.event_group_code || null,
          approvedEventGroupCodes: codes,
        };
      })
      .filter(Boolean);

  return [
    ...mapQueue(movies, 'movie'),
    ...mapQueue(theaterShows, 'theater_show'),
    ...mapQueue(venues, 'venue'),
  ];
}

async function attachVerification(entries, skipVerify, options = {}) {
  if (skipVerify) {
    return entries.map((e) => ({ ...e, verify: null }));
  }
  const codes = entries.map((e) => e.eventGroupCode || e.code).filter(Boolean);
  const verified = await verifyEventGroupCodesParallel(codes, options);
  return entries.map((entry) => {
    const code = entry.eventGroupCode || entry.code || null;
    return { ...entry, verify: code ? verified.get(code) ?? null : null };
  });
}

/**
 * Venue bundle γραμμές καταλόγου: scrape more_link → eventId + play-title → ταύτιση CMS.
 */
async function enrichCatalogWithVenueProgramScrape(catalog, cmsVenues, cmsItems, options = {}) {
  if (!SCRAPE_ENABLED || !SCRAPE_LOOKUP_ENABLED || !Array.isArray(catalog) || !catalog.length) {
    return catalog;
  }

  const maxScrapes = Number(options.maxScrapes ?? SCRAPE_LOOKUP_MAX);
  const onProgress = options.onProgress;
  const scrapeCache = createVenueScrapeCache();
  const movies = cmsItems.filter((item) => item.contentType === 'movie');
  const shows = cmsItems.filter((item) => item.contentType === 'theater_show');

  const nonBundles = [];
  const bundles = [];
  for (const row of catalog) {
    if (row.kind !== 'venue_bundle') nonBundles.push(row);
    else bundles.push(row);
  }

  const orderedBundles = [
    ...bundles.filter((row) => !row.inCms),
    ...bundles.filter((row) => row.inCms),
  ];

  const out = [...nonBundles];
  let scrapeCount = 0;

  for (const row of orderedBundles) {
    if (scrapeCount >= maxScrapes) {
      out.push({
        ...row,
        venueScrape: {
          ok: false,
          skipped: true,
          error: 'scrape_limit',
          hint: `Όριο ${maxScrapes} venue scrape ανά ταύτιση`,
        },
      });
      continue;
    }

    const cmsVenue = findCmsVenueForBundleCode(row.eventGroupCode, cmsVenues);
    const rawLink = cmsVenue?.more_link || cmsVenue?.moreLink || row.moreUrl;
    const moreLink = normalizeMoreUrl(rawLink);
    if (!moreLink) {
      out.push(row);
      continue;
    }

    scrapeCount += 1;
    if (onProgress) {
      onProgress(`Scrape χώρων: ${scrapeCount}/${Math.min(maxScrapes, orderedBundles.length)}…`);
    }

    const scrape = await scrapeCache.get(moreLink);
    if (!scrape?.ok) {
      out.push({
        ...row,
        venueScrape: {
          ok: false,
          moreLink,
          error: scrape?.error || 'scrape_failed',
        },
      });
      continue;
    }

    const pool =
      row.category === 'theater'
        ? shows.map((s) => ({ ...s, contentType: 'theater_show' }))
        : movies.map((m) => ({ ...m, contentType: 'movie' }));

    const events = (scrape.events || []).map((ev) => ({
      eventId: ev.eventId,
      playTitle: ev.playTitle,
      eventDate: ev.eventDate,
      cmsMatch: ev.playTitle ? findBestCmsMatchByPlayTitle(ev.playTitle, pool) : null,
    }));

    out.push({
      ...row,
      venueScrape: {
        ok: true,
        moreLink: scrape.moreLink,
        eventCount: events.length,
        resolvedCount: events.filter((e) => e.cmsMatch).length,
        uniqueTitles: scrape.uniqueTitles || [],
        events: events.slice(0, 48),
        jsonPreview: scrape.jsonPreview || truncateJsonPreview(events.slice(0, 2)),
      },
    });
  }

  out.sort((a, b) => {
    const ai = catalog.findIndex((r) => r.eventGroupCode === a.eventGroupCode);
    const bi = catalog.findIndex((r) => r.eventGroupCode === b.eventGroupCode);
    return ai - bi;
  });

  return out;
}

/**
 * @param {object} strapi
 * @param {{ query?: string, matchCms?: boolean, listAll?: boolean, skipVerify?: boolean, minScore?: number, catalogLimit?: number, onProgress?: function }} options
 */
async function runMoreEventCodeLookup(strapi, options = {}) {
  const started = Date.now();
  const {
    query = null,
    matchCms = true,
    listAll = false,
    skipVerify = false,
    minScore = DEFAULT_MIN_SCORE,
    applyMinScore = DEFAULT_APPLY_MIN_SCORE,
    catalogLimit = 25,
    syncPending = true,
    onProgress = null,
  } = options;
  const progress = (msg) => {
    if (typeof onProgress === 'function' && msg) onProgress(msg);
  };

  progress('Λήψη καταλόγου More (ταινίες & θέατρο)…');
  const catalog = await fetchMoreCatalog();
  const cinemaMovies = catalog.filter((e) => e.category === 'cinema' && e.kind === 'movie');
  const moreTheaterShows = catalog.filter((e) => e.category === 'theater' && e.kind === 'show');
  const venueBundles = catalog.filter((e) => e.kind === 'venue_bundle');

  let catalogRows = [...catalog];
  if (query?.trim()) {
    catalogRows = filterMoreCatalog(catalogRows, query);
  } else if (!matchCms && !listAll && catalogLimit > 0) {
    catalogRows = catalogRows.slice(0, catalogLimit);
  }

  const result = {
    ok: true,
    at: new Date().toISOString(),
    durationMs: 0,
    stats: {
      moreMovies: cinemaMovies.length,
      moreTheaterShows: moreTheaterShows.length,
      venueBundles: venueBundles.length,
      minScore,
      applyMinScore,
    },
    catalog: [],
    matches: [],
    unmatched: [],
    pendingApproval: [],
    venueBundles: venueBundles.slice(0, 12).map((v) => ({
      code: v.code,
      title: v.title,
      moreUrl: v.moreUrl,
    })),
  };

  if (matchCms) {
    progress('Ταύτιση CMS ↔ More…');
    const [cmsItems, cmsVenuesForMatch] = await Promise.all([
      loadAllCmsItems(strapi),
      loadCmsVenuesForLookup(strapi),
    ]);
    const cinemaVenues = cmsVenuesForMatch.filter((v) => v.venueType === 'cinema');
    const rawMatches = matchCmsItemsToMore(cmsItems, catalog, minScore);
    const rawVenueMatches = matchVenueBundlesToCms(cinemaVenues, catalog, minScore);
    const allRawMatches = [...rawMatches, ...rawVenueMatches];

    const codesToVerify = new Set();
    for (const row of allRawMatches) {
      if (row.more?.code) codesToVerify.add(row.more.code);
      for (const match of row.moreMatches || []) {
        if (match.suggestedEventGroupCode) codesToVerify.add(match.suggestedEventGroupCode);
      }
    }

    const verified = skipVerify
      ? new Map()
      : await verifyEventGroupCodesParallel([...codesToVerify], { onProgress: progress });

    result.matches = allRawMatches.map((row) => mapRawMatchToResult(row, verified, applyMinScore));

    result.pendingApproval = result.matches.filter((r) => r.needsApproval);

    result.unmatched = result.matches
      .filter((r) => !r.matched && !r.suggestedEventGroupCode)
      .map((r) => ({
        contentType: r.contentType,
        cmsId: r.cmsId,
        movieId: r.movieId,
        theaterShowId: r.theaterShowId,
        venueId: r.venueId,
        cmsTitle: r.cmsTitle,
        cmsOriginalTitle: r.cmsOriginalTitle,
      }));

    result.stats.cmsMovies = cmsItems.filter((item) => item.contentType === 'movie').length;
    result.stats.cmsTheaterShows = cmsItems.filter((item) => item.contentType === 'theater_show').length;
    result.stats.cmsCinemaVenues = cinemaVenues.length;
    result.stats.matched = result.matches.filter((r) => r.matched).length;
    result.stats.venueMatched = result.matches.filter((r) => r.contentType === 'venue' && r.matched).length;
    result.stats.pendingApproval = result.pendingApproval.length;
    result.stats.unmatched = result.unmatched.length;
    result.stats.withExistingCode = result.matches.filter((r) => r.cmsEventGroupCode).length;

    if (syncPending) {
      await syncPendingApprovals(strapi, result.matches, applyMinScore);
      result.pendingApproval = await loadPendingApprovalItems(strapi);
      result.stats.pendingApproval = result.pendingApproval.length;
    }
  }

  {
    progress('Κατάλογος More & σύγκριση CMS…');
    const [cmsItems, cmsVenues, cmsVenuesForMatch] = await Promise.all([
      loadAllCmsItems(strapi),
      loadCmsVenues(strapi),
      loadCmsVenuesForLookup(strapi),
    ]);
    const cinemaVenuesMapped = cmsVenuesForMatch.filter(
      (v) => !v.venueType || v.venueType === 'cinema',
    );
    const cmsCodeIndex = buildCmsEventGroupCodeIndex(cmsItems, cmsVenues);
    const cmsVenueByMoreId = buildCmsVenueByMoreIdIndex(cmsVenues);

    const withVerify = await attachVerification(
      catalogRows.map((e) => ({
        moreTitle: e.title,
        eventGroupCode: e.code,
        moreUrl: e.moreUrl,
        kind: e.kind,
        category: e.category,
      })),
      skipVerify,
      { onProgress: progress },
    );
    const annotated = annotateCatalogWithCmsStatus(withVerify, cmsCodeIndex, cmsVenueByMoreId);
    let catalogOut = await enrichCatalogWithVenueProgramScrape(annotated, cmsVenues, cmsItems, {
      onProgress: progress,
    });

    const venueSuggestionByCode = new Map();
    for (const row of result.matches || []) {
      if (row.contentType !== 'venue') continue;
      for (const code of row.suggestedEventGroupCodes || []) {
        const prev = venueSuggestionByCode.get(code);
        if (!prev || Number(row.score) > Number(prev.score)) {
          venueSuggestionByCode.set(code, {
            cmsId: row.cmsId,
            cmsTitle: row.cmsTitle,
            score: row.score,
          });
        }
      }
    }

    catalogOut = catalogOut.map((row) => {
      if (row.kind !== 'venue_bundle' || row.inCms) return row;
      const venuesForRow =
        row.category === 'theater'
          ? cmsVenuesForMatch.filter(
              (v) => !v.venueType || v.venueType === 'theater' || v.venueType === 'other',
            )
          : cinemaVenuesMapped;
      const fromMatches = venueSuggestionByCode.get(row.eventGroupCode) || null;
      const venueSuggestions = suggestCmsVenuesForCatalogBundle(row, venuesForRow, minScore);
      const best =
        fromMatches ||
        venueSuggestions[0] ||
        null;
      const suggestedCreateVenue = buildSuggestedVenueCreatePayload(row);
      return {
        ...row,
        suggestedVenue: best,
        venueSuggestions,
        suggestedCreateVenue,
        canApproveVenue: Boolean(best),
        canLinkVenue: true,
        canCreateVenue: Boolean(row.eventGroupCode),
      };
    });

    result.cmsVenueChoices = cmsVenuesForMatch
      .map((v) => ({ id: v.id, title: v.title, slug: v.slug, venueType: v.venueType }))
      .sort((a, b) => a.title.localeCompare(b.title, 'el'))
      .slice(0, 400);

    result.catalog = catalogOut;
    result.stats.catalogShown = result.catalog.length;
    result.stats.catalogVenueScrapeResolved = result.catalog
      .filter((row) => row.venueScrape?.ok)
      .reduce((sum, row) => sum + (row.venueScrape.resolvedCount || 0), 0);
    result.stats.catalogInCms = result.catalog.filter((row) => row.inCms).length;
    result.stats.catalogMissing = result.catalog.filter((row) => !row.inCms).length;
  }

  result.approvedQueue = await loadApprovedQueueItems(strapi);
  result.stats.approvedQueue = result.approvedQueue.reduce(
    (sum, item) => sum + (item.approvedEventGroupCodes?.length || 0),
    0,
  );

  result.sources = {
    catalogCinemaUrl: MORE_CINEMA_URL,
    catalogTheaterUrl: MORE_THEATER_URL,
    eventsApiTemplate: `${MORE_GETEVENTS}?eventGroupCode={code}`,
  };

  result.durationMs = Date.now() - started;
  return result;
}

function skipCodeReason(row, code, score, verify, options) {
  const applyMinScore = options.applyMinScore ?? DEFAULT_APPLY_MIN_SCORE;
  const requireApiVerify = options.requireApiVerify !== false;
  const isPrimaryCode = code === row.suggestedEventGroupCode;

  if (!code) return 'no_code';
  if (score < applyMinScore) return 'low_score';
  if (requireApiVerify && isPrimaryCode && verify && !verify.ok) return 'api_verify_failed';

  const cmsCodes = row.cmsEventGroupCodes?.length
    ? row.cmsEventGroupCodes
    : row.cmsEventGroupCode
      ? [row.cmsEventGroupCode]
      : [];
  if (cmsCodes.includes(code)) return 'already_set';
  const rejected = row.cmsRejectedMoreCodes || [];
  if (rejected.includes(code)) return 'rejected';
  return null;
}

/**
 * Εγγραφή στο CMS μόνο εγκεκριμένων κωδικών (ουρά approved_more_codes).
 * Δεν ξανατρέχει ταύτιση More — μόνο ό,τι είναι ήδη στην ουρά «Έγκρ.».
 * @param {object} strapi
 * @param {{ overwriteExisting?: boolean, onProgress?: (msg: string) => void }} options
 */
async function applyMoreEventCodeMatches(strapi, options = {}) {
  const started = Date.now();
  const overwriteExisting = options.overwriteExisting === true;
  const onProgress = options.onProgress;

  if (onProgress) onProgress('Φόρτωση ουράς εγκεκριμένων κωδικών…');

  const queue = await loadApprovedQueueItems(strapi);
  if (onProgress) {
    const queuedCodes = queue.reduce((sum, item) => sum + (item.approvedEventGroupCodes?.length || 0), 0);
    onProgress(
      queuedCodes > 0
        ? `Εγγραφή CMS · ${queuedCodes} κωδικοί στην ουρά`
        : 'Δεν υπάρχουν εγκεκριμένοι κωδικοί στην ουρά',
    );
  }
  const applied = [];
  const skipped = [];
  const codeTakenBy = new Map();

  for (const row of queue) {
    const contentType = row.contentType || 'movie';
    const cmsId = row.cmsId ?? row.movieId ?? row.theaterShowId ?? row.venueId;
    const codes = row.approvedEventGroupCodes || [];
    if (!codes.length) continue;

    const titleField = contentType === 'venue' ? 'name' : 'title';
    const entry = await strapi.entityService.findOne(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
      fields: ['id', titleField, 'event_group_code'],
      populate: { more_event_groups: true, approved_more_codes: true },
      publicationState: 'preview',
    });
    if (!entry) {
      for (const code of codes) {
        skipped.push({
          contentType,
          cmsId,
          cmsTitle: row.cmsTitle,
          suggestedEventGroupCode: code,
          reason: 'entry_not_found',
        });
      }
      continue;
    }

    const codesToApply = [];
    for (const code of codes) {
      const existingCodes =
        contentType === 'venue' ? collectVenueBundleCodes(entry) : collectEventGroupCodes(entry);
      if (existingCodes.includes(code)) {
        skipped.push({
          contentType,
          cmsId,
          cmsTitle: row.cmsTitle,
          suggestedEventGroupCode: code,
          reason: 'already_set',
        });
        continue;
      }

      const ownerKey = `${contentType}:${code}`;
      const existingOwner = codeTakenBy.get(ownerKey);
      if (existingOwner != null && existingOwner !== cmsId) {
        skipped.push({
          contentType,
          cmsId,
          cmsTitle: row.cmsTitle,
          suggestedEventGroupCode: code,
          reason: 'duplicate_code',
        });
        continue;
      }

      codesToApply.push(code);
      codeTakenBy.set(ownerKey, cmsId);
    }

    if (!codesToApply.length) {
      await strapi.entityService.update(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
        data: { approved_more_codes: [] },
      });
      continue;
    }

    try {
      const merged = await mergeEventGroupCodesIntoCms(strapi, contentType, entry, codesToApply, {
        overwriteExisting,
      });

      const refreshed = await strapi.entityService.findOne(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
        fields: ['id', titleField, 'event_group_code'],
        populate: { more_event_groups: true, approved_more_codes: true },
        publicationState: 'preview',
      });

      const remainingApproved = approvedGroupsFromEntry(refreshed).filter(
        (group) => !merged.added.includes(group.code),
      );

      await strapi.entityService.update(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
        data: { approved_more_codes: remainingApproved },
      });
      await clearCmsPending(strapi, contentType, cmsId);

      const primaryCode = String(refreshed.event_group_code || '').trim();
      for (const code of codesToApply) {
        if (!merged.added.includes(code)) {
          skipped.push({
            contentType,
            cmsId,
            cmsTitle: row.cmsTitle,
            suggestedEventGroupCode: code,
            reason: 'not_added',
          });
          continue;
        }
        applied.push({
          contentType,
          cmsId,
          movieId: row.movieId,
          theaterShowId: row.theaterShowId,
          venueId: row.venueId,
          cmsTitle: row.cmsTitle,
          eventGroupCode: code,
          previousCode: row.cmsEventGroupCode || null,
          addedAsSecondary: Boolean(primaryCode && code !== primaryCode),
        });
      }
    } catch (e) {
      for (const code of codesToApply) {
        skipped.push({
          contentType,
          cmsId,
          cmsTitle: row.cmsTitle,
          suggestedEventGroupCode: code,
          reason: 'update_failed',
          error: e?.message || String(e),
        });
      }
    }
  }

  const approvedQueue = await loadApprovedQueueItems(strapi);
  const pendingApproval = await loadPendingApprovalItems(strapi);
  const approvedQueueCount = approvedQueue.reduce(
    (sum, item) => sum + (item.approvedEventGroupCodes?.length || 0),
    0,
  );

  return {
    ok: true,
    pendingApproval,
    approvedQueue,
    stats: { approvedQueue: approvedQueueCount },
    apply: {
      overwriteExisting,
      applied,
      skipped,
      stats: {
        applied: applied.length,
        skipped: skipped.length,
        queued: queue.reduce((sum, item) => sum + (item.approvedEventGroupCodes?.length || 0), 0),
      },
    },
    durationMs: Date.now() - started,
    message:
      applied.length > 0
        ? `Εγγράφηκαν ${applied.length} εγκεκριμένοι κωδικοί · παραλείφθηκαν ${skipped.length}`
        : `Δεν υπάρχουν εγκεκριμένοι κωδικοί προς εγγραφή${skipped.length ? ` · παραλείφθηκαν ${skipped.length}` : ''}`,
  };
}

module.exports = {
  DEFAULT_MIN_SCORE,
  DEFAULT_APPLY_MIN_SCORE,
  MIN_HINT_SCORE,
  CMS_LOOKUP_CONFIG,
  fetchMoreCatalog,
  moreEventsApiUrl,
  verifyEventGroupCode,
  scrapeMoreVenueProgram: require('./moreVenueProgramScrape').scrapeMoreVenueProgram,
  enrichCatalogWithVenueProgramScrape,
  runMoreEventCodeLookup,
  applyMoreEventCodeMatches,
  approveMoreEventGroupCode,
  queueApproveMoreEventGroupCode,
  rejectMoreEventGroupCode,
  linkMoreCodeToCms,
  createVenueFromMoreCatalog,
  loadApprovedQueueItems,
  loadPendingApprovalItems,
  loadPendingApprovalMovies,
  loadCmsMovies,
  loadCmsTheaterShows,
  loadAllCmsItems,
  clearCmsPending,
  clearMoviePending,
  needsApproval,
  normalizeText,
  filterMoreCatalog,
  filterMoreMovies,
  matchCmsItemsToMore,
  matchMoviesToMore,
  scoreMatch,
  morePageSlugFromUrl,
  compactSlugKey,
  buildCatalogSlugIndex,
};
