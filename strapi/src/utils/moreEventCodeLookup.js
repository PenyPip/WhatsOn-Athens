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

function parseMoreCatalogHtml(html, { category, classifyKind }) {
  const byCode = new Map();

  for (const m of html.matchAll(/data-code="(evg_[a-z0-9_]+)"/gi)) {
    const code = m[1];
    if (byCode.has(code)) continue;

    const chunk = html.slice(Math.max(0, m.index - 200), m.index + 4000);
    const urlMatch = chunk.match(/itemprop="url"\s+content="([^"]+)"/i);
    const nameMatch = chunk.match(/itemprop="name"\s+content="([^"]+)"/i);
    const hMatch = chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]{2,120})</i);

    let title = nameMatch?.[1]?.trim() || hMatch?.[1]?.trim() || '';
    if (!title && urlMatch?.[1]) title = slugFromMoreUrl(urlMatch[1], category);

    const kind = classifyKind(code);
    byCode.set(code, {
      code,
      title: title || '(χωρίς τίτλο)',
      moreUrl: urlMatch?.[1] ? `https://www.more.com${urlMatch[1]}` : null,
      kind,
      category,
    });
  }

  return [...byCode.values()];
}

function isLikelyVenueBundle(code) {
  const slug = String(code || '')
    .replace(/^evg_/i, '')
    .split('_')[0]
    .toLowerCase();
  return /cinema|kinematog|movietheater|apollon|ribiera|europacinema|aiglecinema|athenaia/.test(slug);
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
    classifyKind: (code) => (isLikelyVenueBundle(code) ? 'venue_bundle' : 'movie'),
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
  const candidates = [cmsMovie.title, cmsMovie.originalTitle, cmsMovie.slug].filter(Boolean);
  const moreTitle = moreEntry.title;
  const moreCompact = compactText(moreTitle);
  const slugPart = moreEntry.code.replace(/^evg_/i, '').split('_')[0];

  let best = 0;
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

    if (slugPart && nc.includes(slugPart.replace(/[^a-z0-9]/g, ''))) {
      best = Math.max(best, 0.75);
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

    let best = null;
    let bestScore = 0;
    for (const more of pool) {
      const score = scoreMatch(cms, more);
      if (score > bestScore) {
        bestScore = score;
        best = more;
      }
    }
    results.push({
      cms,
      more: bestScore >= MIN_HINT_SCORE ? best : null,
      score: bestScore,
      matched: bestScore >= minScore && best != null,
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
  const codes = new Set([
    ...collectVenueBundleCodes(venue),
    ...collectTheaterVenueBundleCodes(venue),
  ]);
  const direct = String(venue?.event_group_code ?? '').trim();
  if (direct && /^evg_/i.test(direct)) codes.add(direct);
  const fromLink = String(venue?.more_link ?? '').match(/(evg_[a-z0-9_]+)/i);
  if (fromLink?.[1]) codes.add(fromLink[1]);
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

function annotateCatalogWithCmsStatus(entries, cmsCodeIndex) {
  return entries.map((entry) => {
    const refs = cmsCodeIndex.get(entry.eventGroupCode) || [];
    const inCms = refs.some((ref) => ref.inCms);
    const pendingOnly = refs.length > 0 && refs.every((ref) => ref.pending);
    return {
      ...entry,
      inCms,
      cmsRefs: refs,
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
    populate: contentType === 'theater_show' ? { more_event_groups: true } : undefined,
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
    if (contentType === 'theater_show') {
      const moreGroups = (entry.more_event_groups || []).map((group) => ({
        code: String(group.code || '').trim(),
      })).filter((group) => group.code);
      moreGroups.push({ code });

      await strapi.entityService.update(config.uid, id, {
        data: {
          more_event_groups: moreGroups,
          pending_event_group_code: null,
          pending_more_title: null,
          pending_match_score: null,
        },
      });

      return {
        ok: true,
        contentType,
        cmsId: id,
        movieId: null,
        theaterShowId: id,
        cmsTitle: entry.title,
        eventGroupCode: code,
        previousCode: existing || null,
        addedAsSecondary: true,
      };
    }
    throw new Error(
      'Η ταινία έχει ήδη event_group_code — ενεργοποίησε «Αντικατάσταση» ή άλλαξέ το χειροκίνητα.',
    );
  }

  const clearPending =
    contentType === 'theater_show'
      ? {
          pending_event_group_code: null,
          pending_more_title: null,
          pending_match_score: null,
        }
      : {};

  await strapi.entityService.update(config.uid, id, {
    data: {
      event_group_code: code,
      ...clearPending,
    },
  });

  return {
    ok: true,
    contentType,
    cmsId: id,
    movieId: contentType === 'movie' ? id : null,
    theaterShowId: contentType === 'theater_show' ? id : null,
    cmsTitle: entry.title,
    eventGroupCode: code,
    previousCode: existing || null,
  };
}

async function attachVerification(entries, skipVerify) {
  if (skipVerify) {
    return entries.map((e) => ({ ...e, verify: null }));
  }
  const out = [];
  for (const entry of entries) {
    const verify = entry.code ? await verifyEventGroupCode(entry.code) : null;
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

  let catalogRows = catalog.filter((e) => e.kind !== 'venue_bundle');
  if (query?.trim()) {
    catalogRows = filterMoreCatalog(catalogRows, query);
  } else if (listAll) {
    catalogRows = catalogRows;
  } else if (!matchCms) {
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
    }

    const verified = new Map();
    if (!skipVerify) {
      for (const code of codesToVerify) {
        verified.set(code, await verifyEventGroupCode(code));
      }
    }

    result.matches = rawMatches.map((row) => {
      const suggestedCode = row.more?.code ?? null;
      const verify = suggestedCode ? verified.get(suggestedCode) ?? null : null;
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

  if (!matchCms || query?.trim() || listAll) {
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

function skipReason(row, options) {
  const applyMinScore = options.applyMinScore ?? DEFAULT_APPLY_MIN_SCORE;
  const overwriteExisting = options.overwriteExisting === true;
  const requireApiVerify = options.requireApiVerify !== false;

  if (!row.matched) return 'no_match';
  if (row.score < applyMinScore) return 'low_score';
  if (!row.suggestedEventGroupCode) return 'no_code';
  if (requireApiVerify && !row.verify?.ok) return 'api_verify_failed';
  const cmsCodes = row.cmsEventGroupCodes?.length
    ? row.cmsEventGroupCodes
    : row.cmsEventGroupCode
      ? [row.cmsEventGroupCode]
      : [];
  if (cmsCodes.includes(row.suggestedEventGroupCode)) return 'already_set';
  if (row.conflict && !overwriteExisting) return 'conflict';
  if (cmsCodes.length && !overwriteExisting) return 'has_existing_code';
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
    .filter((r) => r.matched && r.suggestedEventGroupCode)
    .sort((a, b) => b.score - a.score);

  const codeTakenBy = new Map();
  const applied = [];
  const skipped = [];

  for (const row of candidates) {
    const reason = skipReason(row, { applyMinScore, overwriteExisting, requireApiVerify });
    if (reason) {
      skipped.push({
        contentType: row.contentType,
        cmsId: row.cmsId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
        cmsTitle: row.cmsTitle,
        suggestedEventGroupCode: row.suggestedEventGroupCode,
        cmsEventGroupCode: row.cmsEventGroupCode,
        score: row.score,
        reason,
      });
      continue;
    }

    const code = row.suggestedEventGroupCode;
    const contentType = row.contentType || 'movie';
    const cmsId = row.cmsId ?? row.movieId ?? row.theaterShowId;
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
        score: row.score,
        reason: 'duplicate_code',
      });
      continue;
    }

    try {
      await strapi.entityService.update(CMS_LOOKUP_CONFIG[contentType].uid, cmsId, {
        data: { event_group_code: code },
      });
      codeTakenBy.set(ownerKey, cmsId);
      await clearCmsPending(strapi, contentType, cmsId);
      applied.push({
        contentType,
        cmsId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
        cmsTitle: row.cmsTitle,
        moreTitle: row.moreTitle,
        eventGroupCode: code,
        previousCode: row.cmsEventGroupCode || null,
        score: row.score,
      });
    } catch (e) {
      skipped.push({
        contentType,
        cmsId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
        cmsTitle: row.cmsTitle,
        suggestedEventGroupCode: code,
        score: row.score,
        reason: 'update_failed',
        error: e?.message || String(e),
      });
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
};
