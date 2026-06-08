'use strict';

const MORE_CINEMA_URL = 'https://www.more.com/gr-el/tickets/cinema/';
const MORE_THEATER_URL = 'https://www.more.com/gr-el/tickets/theater/';
const MORE_GETEVENTS = 'https://www.more.com/_api/playdetails/getevents';
const USER_AGENT = 'whatson-more-lookup/1.0';
const FETCH_TIMEOUT_MS = 25_000;
const MIN_HINT_SCORE = 0.45;
const DEFAULT_MIN_SCORE = MIN_HINT_SCORE;
const DEFAULT_APPLY_MIN_SCORE = Number(process.env.MORE_LOOKUP_APPLY_MIN_SCORE || MIN_HINT_SCORE);
const {
  collectEventGroupCodes,
  collectVenueBundleCodes,
  collectTheaterVenueBundleCodes,
  classifyCinemaCatalogKind,
  extractEvgCodeFromText,
} = require('./moreEventGroupCodes');

const CMS_LOOKUP_CONFIG = {
  movie: {
    uid: 'api::movie.movie',
    moreCategory: 'cinema',
  },
  theater_show: {
    uid: 'api::theater-show.theater-show',
    moreCategory: 'theater',
  },
};

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
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMoreCatalog() {
  const [cinemaHtml, theaterHtml] = await Promise.all([
    fetchText(MORE_CINEMA_URL),
    fetchText(MORE_THEATER_URL),
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

async function verifyEventGroupCode(code) {
  const url = `${MORE_GETEVENTS}?eventGroupCode=${encodeURIComponent(code)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const raw = await res.text();
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, error: 'κενή απάντηση More API' };
    let events;
    try {
      events = JSON.parse(trimmed);
    } catch (e) {
      return { ok: false, error: e?.message || 'invalid JSON' };
    }
    if (!Array.isArray(events)) return { ok: false, error: 'not array' };

    const venues = new Map();
    for (const ev of events) {
      const vid = String(ev.venueId ?? '');
      if (vid) venues.set(vid, ev.venueName || vid);
    }

    return {
      ok: true,
      eventCount: events.length,
      venueCount: venues.size,
      sampleVenues: [...venues.entries()].slice(0, 4).map(([id, name]) => ({ id, name })),
      sampleEventId: events[0]?.eventId ?? null,
    };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
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

function matchCmsItemsToMore(cmsItems, catalog, minScore = DEFAULT_MIN_SCORE) {
  const results = [];

  for (const cms of cmsItems) {
    const config = CMS_LOOKUP_CONFIG[cms.contentType];
    const pool = catalog.filter((entry) => {
      if (entry.category !== config.moreCategory) return false;
      if (config.moreCategory === 'cinema') return entry.kind === 'movie';
      return entry.kind === 'show';
    });

    const scored = [];

    for (const hit of findCatalogByCmsSlug(cms, catalog, config)) {
      if (hit.score < MIN_HINT_SCORE) continue;
      scored.push({ ...hit, matchMethod: 'more_page_slug' });
    }

    for (const more of pool) {
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
    pendingEventGroupCode: row.pending_event_group_code ?? '',
    pendingMoreTitle: row.pending_more_title ?? '',
    pendingMatchScore: row.pending_match_score ?? null,
  };
}

async function loadCmsMovies(strapi) {
  const rows = await strapi.entityService.findMany('api::movie.movie', {
    fields: ['id', 'title', 'original_title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
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
    populate: { more_event_groups: true },
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
    fields: ['id', 'name', 'type', 'event_group_code', 'more_link'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { pageSize: 500 },
  });
  return Array.isArray(rows) ? rows : [];
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
    for (const code of collectEventGroupCodes(item)) {
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
  }

  return byCode;
}

/**
 * Ποια CMS εγγραφή μετράει ανά γραμμή καταλόγου More.
 * Σινεμά (venue_bundle) → μόνο χώροι τύπου cinema · ταινίες → movie · θέατρο → theater_show.
 */
function filterCmsRefsForCatalogEntry(entry, refs) {
  if (!Array.isArray(refs) || !refs.length) return [];

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

function annotateCatalogWithCmsStatus(entries, cmsCodeIndex) {
  return entries.map((entry) => {
    const allRefs = cmsCodeIndex.get(entry.eventGroupCode) || [];
    const cmsRefs = filterCmsRefsForCatalogEntry(entry, allRefs);
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
    const inCms = cmsRefs.length > 0;
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
    : collectEventGroupCodes(cms);
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
  if (contentType === 'movie') return;
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
  const existingCodes = collectEventGroupCodes(entry);
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

  if (contentType === 'theater_show') {
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
    const cmsId = row.cmsId ?? row.movieId ?? row.theaterShowId;
    if (!cmsId) continue;

    if (needsApproval(row, applyMinScore)) {
      pendingIds.add(`${contentType}:${cmsId}`);
      if (contentType !== 'movie') {
        await strapi.entityService.update(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
          data: {
            pending_event_group_code: row.suggestedEventGroupCode,
            pending_more_title: row.moreTitle || null,
            pending_match_score: row.score,
          },
        });
      }
    } else if (row.cmsEventGroupCode || row.score >= applyMinScore) {
      await clearCmsPending(strapi, contentType, cmsId);
    }
  }
  return pendingIds.size;
}

async function loadPendingApprovalItems(strapi) {
  const theaterShows = await strapi.entityService.findMany('api::theater-show.theater-show', {
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
    });

  const theaterList = (Array.isArray(theaterShows) ? theaterShows : [])
    .filter((m) => String(m.pending_event_group_code || '').trim())
    .map((m) => ({
      contentType: 'theater_show',
      cmsId: m.id,
      movieId: null,
      theaterShowId: m.id,
      cmsTitle: m.title ?? '',
      cmsOriginalTitle: '',
      cmsSlug: m.slug ?? '',
      cmsEventGroupCode: m.event_group_code || null,
      suggestedEventGroupCode: String(m.pending_event_group_code).trim(),
      moreTitle: m.pending_more_title || null,
      score: Number(m.pending_match_score) || 0,
    }));

  return theaterList.sort((a, b) => a.cmsTitle.localeCompare(b.cmsTitle, 'el'));
}

/** @deprecated */
async function loadPendingApprovalMovies(strapi) {
  return loadPendingApprovalItems(strapi);
}

/**
 * Έγκριση προτεινόμενου event_group_code → εγγραφή στο CMS.
 */
async function approveMoreEventGroupCode(strapi, options = {}) {
  const contentType =
    options.contentType ||
    (options.theaterShowId != null ? 'theater_show' : 'movie');
  const config = CMS_LOOKUP_CONFIG[contentType];
  if (!config) throw new Error(`Άγνωστος τύπος CMS: ${contentType}`);

  const id = Number(options.cmsId ?? options.movieId ?? options.theaterShowId);
  if (!Number.isFinite(id)) {
    throw new Error('Άκυρο cmsId');
  }

  const { overwriteExisting = false, eventGroupCode } = options;

  const entry = await strapi.entityService.findOne(config.uid, id, {
    fields: ['id', 'title', 'event_group_code', 'pending_event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
  });
  if (!entry) {
    throw new Error(contentType === 'movie' ? 'Η ταινία δεν βρέθηκε' : 'Η παράσταση δεν βρέθηκε');
  }

  const code = String(
    eventGroupCode || entry.pending_event_group_code || '',
  ).trim();
  if (!code) throw new Error('Λείπει event_group_code προς έγκριση');

  const existingCodes = collectEventGroupCodes(entry);
  const existing = String(entry.event_group_code || '').trim();

  if (existingCodes.includes(code)) {
    await clearCmsPending(strapi, contentType, id);
    return {
      ok: true,
      contentType,
      cmsId: id,
      movieId: contentType === 'movie' ? id : null,
      theaterShowId: contentType === 'theater_show' ? id : null,
      cmsTitle: entry.title,
      eventGroupCode: code,
      previousCode: existing || null,
      alreadyPresent: true,
    };
  }

  if (existing && existing !== code && !overwriteExisting) {
    const merged = await mergeEventGroupCodesIntoCms(strapi, contentType, entry, [code]);
    await clearCmsPending(strapi, contentType, id);
    return {
      ok: true,
      contentType,
      cmsId: id,
      movieId: contentType === 'movie' ? id : null,
      theaterShowId: contentType === 'theater_show' ? id : null,
      cmsTitle: entry.title,
      eventGroupCode: code,
      previousCode: existing || null,
      addedAsSecondary: merged.addedAsSecondary === true,
    };
  }

  const merged = await mergeEventGroupCodesIntoCms(strapi, contentType, entry, [code], {
    overwriteExisting,
  });
  await clearCmsPending(strapi, contentType, id);

  return {
    ok: true,
    contentType,
    cmsId: id,
    movieId: contentType === 'movie' ? id : null,
    theaterShowId: contentType === 'theater_show' ? id : null,
    cmsTitle: entry.title,
    eventGroupCode: code,
    previousCode: existing || null,
    addedAsSecondary: merged.addedAsSecondary === true,
  };
}

async function attachVerification(entries, skipVerify) {
  if (skipVerify) {
    return entries.map((e) => ({ ...e, verify: null }));
  }
  const out = [];
  for (const entry of entries) {
    const code = entry.eventGroupCode || entry.code || null;
    const verify = code ? await verifyEventGroupCode(code) : null;
    out.push({ ...entry, verify });
  }
  return out;
}

/**
 * @param {object} strapi
 * @param {{ query?: string, matchCms?: boolean, listAll?: boolean, skipVerify?: boolean, minScore?: number, catalogLimit?: number }} options
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
  } = options;

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
    const cmsItems = await loadAllCmsItems(strapi);
    const rawMatches = matchCmsItemsToMore(cmsItems, catalog, minScore);

    const codesToVerify = new Set();
    for (const row of rawMatches) {
      if (row.more?.code) codesToVerify.add(row.more.code);
      for (const match of row.moreMatches || []) {
        if (match.suggestedEventGroupCode) codesToVerify.add(match.suggestedEventGroupCode);
      }
    }

    const verified = new Map();
    if (!skipVerify) {
      for (const code of codesToVerify) {
        verified.set(code, await verifyEventGroupCode(code));
      }
    }

    result.matches = rawMatches.map((row) => {
      const suggestedCode = row.more?.code ?? null;
      const suggestedCodes = row.suggestedEventGroupCodes || (suggestedCode ? [suggestedCode] : []);
      const verify = suggestedCode ? verified.get(suggestedCode) ?? null : null;
      const moreMatches = (row.moreMatches || []).map((match) => ({
        ...match,
        verify: match.suggestedEventGroupCode
          ? verified.get(match.suggestedEventGroupCode) ?? null
          : null,
      }));
      const cmsCodes = row.cms.eventGroupCodes || [];
      const cmsCode = row.cms.eventGroupCode || cmsCodes[0] || null;
      const hasSuggested = cmsHasEventGroupCode(row.cms, suggestedCode);
      return {
        contentType: row.cms.contentType,
        cmsId: row.cms.id,
        movieId: row.cms.contentType === 'movie' ? row.cms.id : null,
        theaterShowId: row.cms.contentType === 'theater_show' ? row.cms.id : null,
        cmsTitle: row.cms.title,
        cmsOriginalTitle: row.cms.originalTitle,
        cmsSlug: row.cms.slug,
        cmsEventGroupCode: cmsCode,
        cmsEventGroupCodes: cmsCodes,
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
    });

    result.pendingApproval = result.matches.filter((r) => r.needsApproval);

    result.unmatched = result.matches
      .filter((r) => !r.matched && !r.suggestedEventGroupCode)
      .map((r) => ({
        contentType: r.contentType,
        cmsId: r.cmsId,
        movieId: r.movieId,
        theaterShowId: r.theaterShowId,
        cmsTitle: r.cmsTitle,
        cmsOriginalTitle: r.cmsOriginalTitle,
      }));

    result.stats.cmsMovies = cmsItems.filter((item) => item.contentType === 'movie').length;
    result.stats.cmsTheaterShows = cmsItems.filter((item) => item.contentType === 'theater_show').length;
    result.stats.matched = result.matches.filter((r) => r.matched).length;
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
    const [cmsItems, cmsVenues] = await Promise.all([
      loadAllCmsItems(strapi),
      loadCmsVenues(strapi),
    ]);
    const cmsCodeIndex = buildCmsEventGroupCodeIndex(cmsItems, cmsVenues);

    const withVerify = await attachVerification(
      catalogRows.map((e) => ({
        moreTitle: e.title,
        eventGroupCode: e.code,
        moreUrl: e.moreUrl,
        kind: e.kind,
        category: e.category,
      })),
      skipVerify,
    );
    result.catalog = annotateCatalogWithCmsStatus(withVerify, cmsCodeIndex);
    result.stats.catalogShown = result.catalog.length;
    result.stats.catalogInCms = result.catalog.filter((row) => row.inCms).length;
    result.stats.catalogMissing = result.catalog.filter((row) => !row.inCms).length;
  }

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
  return null;
}

/**
 * Ταύτιση + εγγραφή event_group_code στις ταινίες CMS.
 * @param {object} strapi
 * @param {{ query?: string, minScore?: number, applyMinScore?: number, overwriteExisting?: boolean, requireApiVerify?: boolean }} options
 */
async function applyMoreEventCodeMatches(strapi, options = {}) {
  const started = Date.now();
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const applyMinScore = options.applyMinScore ?? DEFAULT_APPLY_MIN_SCORE;
  const overwriteExisting = options.overwriteExisting === true;
  const requireApiVerify = options.requireApiVerify !== false;

  const lookup = await runMoreEventCodeLookup(strapi, {
    query: options.query ?? null,
    matchCms: true,
    skipVerify: false,
    minScore,
  });

  const candidates = lookup.matches
    .filter((r) => r.matched)
    .sort((a, b) => b.score - a.score);

  const codeTakenBy = new Map();
  const applied = [];
  const skipped = [];
  const entryCache = new Map();

  for (const row of candidates) {
    const contentType = row.contentType || 'movie';
    const cmsId = row.cmsId ?? row.movieId ?? row.theaterShowId;
    const codeRows = selectApplyCodesFromMatch(row, applyMinScore);

    const codesToApply = [];
    for (const match of codeRows) {
      const code = match.suggestedEventGroupCode;
      const reason = skipCodeReason(
        row,
        code,
        Number(match.score ?? row.score),
        match.verify ?? row.verify,
        { applyMinScore, overwriteExisting, requireApiVerify },
      );
      if (reason) {
        skipped.push({
          contentType,
          cmsId,
          movieId: row.movieId,
          theaterShowId: row.theaterShowId,
          cmsTitle: row.cmsTitle,
          suggestedEventGroupCode: code,
          cmsEventGroupCode: row.cmsEventGroupCode,
          score: Number(match.score ?? row.score),
          reason,
        });
        continue;
      }

      const ownerKey = `${contentType}:${code}`;
      const existingOwner = codeTakenBy.get(ownerKey);
      if (existingOwner != null && existingOwner !== cmsId) {
        skipped.push({
          contentType,
          cmsId,
          movieId: row.movieId,
          theaterShowId: row.theaterShowId,
          cmsTitle: row.cmsTitle,
          suggestedEventGroupCode: code,
          score: Number(match.score ?? row.score),
          reason: 'duplicate_code',
        });
        continue;
      }
      codesToApply.push({
        code,
        score: Number(match.score ?? row.score),
        moreTitle: match.moreTitle ?? row.moreTitle,
      });
      codeTakenBy.set(ownerKey, cmsId);
    }

    if (!codesToApply.length) continue;

    try {
      const cacheKey = `${contentType}:${cmsId}`;
      if (!entryCache.has(cacheKey)) {
        const entry = await strapi.entityService.findOne(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
          fields: ['id', 'title', 'event_group_code'],
          populate: { more_event_groups: true },
          publicationState: 'preview',
        });
        entryCache.set(cacheKey, entry);
      }

      const merged = await mergeEventGroupCodesIntoCms(
        strapi,
        contentType,
        entryCache.get(cacheKey),
        codesToApply.map((item) => item.code),
        { overwriteExisting },
      );

      const refreshed = await strapi.entityService.findOne(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
        fields: ['id', 'title', 'event_group_code'],
        populate: { more_event_groups: true },
        publicationState: 'preview',
      });
      entryCache.set(cacheKey, refreshed);

      await clearCmsPending(strapi, contentType, cmsId);
      const primaryCode = String(refreshed.event_group_code || '').trim();
      for (const item of codesToApply) {
        if (!merged.added.includes(item.code)) continue;
        applied.push({
          contentType,
          cmsId,
          movieId: row.movieId,
          theaterShowId: row.theaterShowId,
          cmsTitle: row.cmsTitle,
          moreTitle: item.moreTitle,
          eventGroupCode: item.code,
          previousCode: row.cmsEventGroupCode || null,
          score: item.score,
          addedAsSecondary: Boolean(primaryCode && item.code !== primaryCode),
        });
      }
    } catch (e) {
      for (const item of codesToApply) {
        skipped.push({
          contentType,
          cmsId,
          movieId: row.movieId,
          theaterShowId: row.theaterShowId,
          cmsTitle: row.cmsTitle,
          suggestedEventGroupCode: item.code,
          score: item.score,
          reason: 'update_failed',
          error: e?.message || String(e),
        });
      }
    }
  }

  return {
    ...lookup,
    apply: {
      applyMinScore,
      overwriteExisting,
      applied,
      skipped,
      stats: {
        applied: applied.length,
        skipped: skipped.length,
      },
    },
    durationMs: Date.now() - started,
    message: `Ενημερώθηκαν ${applied.length} εγγραφές · παραλείφθηκαν ${skipped.length}`,
  };
}

module.exports = {
  DEFAULT_MIN_SCORE,
  DEFAULT_APPLY_MIN_SCORE,
  MIN_HINT_SCORE,
  CMS_LOOKUP_CONFIG,
  fetchMoreCatalog,
  verifyEventGroupCode,
  runMoreEventCodeLookup,
  applyMoreEventCodeMatches,
  approveMoreEventGroupCode,
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
