'use strict';

const MORE_CINEMA_URL = 'https://www.more.com/gr-el/tickets/cinema/';
const MORE_GETEVENTS = 'https://www.more.com/_api/playdetails/getevents';
const USER_AGENT = 'whatson-more-lookup/1.0';
const FETCH_TIMEOUT_MS = 25_000;
const DEFAULT_MIN_SCORE = 0.68;
const DEFAULT_APPLY_MIN_SCORE = Number(process.env.MORE_LOOKUP_APPLY_MIN_SCORE || 0.85);
const MIN_HINT_SCORE = 0.45;
const { collectEventGroupCodes } = require('./moreEventGroupCodes');

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

function slugFromMoreUrl(url) {
  const m = String(url || '').match(/\/cinemas?\/([^/]+)/i);
  if (!m) return '';
  return decodeURIComponent(m[1])
    .replace(/-\d+$/, '')
    .replace(/-/g, ' ');
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
  const html = await fetchText(MORE_CINEMA_URL);
  const byCode = new Map();

  for (const m of html.matchAll(/data-code="(evg_[a-z0-9_]+)"/gi)) {
    const code = m[1];
    if (byCode.has(code)) continue;

    const chunk = html.slice(Math.max(0, m.index - 200), m.index + 4000);
    const urlMatch = chunk.match(/itemprop="url"\s+content="([^"]+)"/i);
    const nameMatch = chunk.match(/itemprop="name"\s+content="([^"]+)"/i);
    const hMatch = chunk.match(/class="[^"]*title[^"]*"[^>]*>([^<]{2,120})</i);

    let title = nameMatch?.[1]?.trim() || hMatch?.[1]?.trim() || '';
    if (!title && urlMatch?.[1]) title = slugFromMoreUrl(urlMatch[1]);

    byCode.set(code, {
      code,
      title: title || '(χωρίς τίτλο)',
      moreUrl: urlMatch?.[1] ? `https://www.more.com${urlMatch[1]}` : null,
      kind: isLikelyVenueBundle(code) ? 'venue_bundle' : 'movie',
    });
  }

  return [...byCode.values()].sort((a, b) => a.title.localeCompare(b.title, 'el'));
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
    const events = await res.json();
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

function matchMoviesToMore(cmsMovies, moreMovies, minScore = DEFAULT_MIN_SCORE) {
  const onlyMovies = moreMovies.filter((m) => m.kind === 'movie');
  const results = [];

  for (const cms of cmsMovies) {
    let best = null;
    let bestScore = 0;
    for (const more of onlyMovies) {
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

function filterMoreMovies(movies, query) {
  if (!query?.trim()) return movies;
  const nq = normalizeText(query);
  return movies.filter(
    (e) =>
      normalizeText(e.title).includes(nq) ||
      normalizeText(e.code).includes(nq.replace(/\s+/g, '')) ||
      compactText(e.title).includes(compactText(query)),
  );
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
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { pageSize: 500 },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row) => {
    const eventGroupCodes = collectEventGroupCodes(row);
    return {
      id: row.id,
      title: row.title ?? '',
      originalTitle: row.original_title ?? '',
      slug: row.slug ?? '',
      eventGroupCode: row.event_group_code ?? '',
      eventGroupCodes,
      pendingEventGroupCode: row.pending_event_group_code ?? '',
      pendingMoreTitle: row.pending_more_title ?? '',
      pendingMatchScore: row.pending_match_score ?? null,
    };
  });
}

function movieHasEventGroupCode(cms, code) {
  if (!code) return false;
  const codes = cms.eventGroupCodes?.length
    ? cms.eventGroupCodes
    : collectEventGroupCodes(cms);
  return codes.includes(code);
}

function needsApproval(row, applyMinScore = DEFAULT_APPLY_MIN_SCORE) {
  if (!row.suggestedEventGroupCode) return false;
  if (row.score >= applyMinScore) return false;
  if (movieHasEventGroupCode(row, row.suggestedEventGroupCode)) return false;
  return true;
}

async function clearMoviePending(strapi, movieId) {
  await strapi.entityService.update('api::movie.movie', movieId, {
    data: {
      pending_event_group_code: null,
      pending_more_title: null,
      pending_match_score: null,
    },
  });
}

async function syncPendingApprovals(strapi, matches, applyMinScore = DEFAULT_APPLY_MIN_SCORE) {
  const pendingIds = new Set();
  for (const row of matches) {
    if (needsApproval(row, applyMinScore)) {
      pendingIds.add(row.movieId);
      await strapi.entityService.update('api::movie.movie', row.movieId, {
        data: {
          pending_event_group_code: row.suggestedEventGroupCode,
          pending_more_title: row.moreTitle || null,
          pending_match_score: row.score,
        },
      });
    } else if (row.cmsEventGroupCode || row.score >= applyMinScore) {
      await clearMoviePending(strapi, row.movieId);
    }
  }
  return pendingIds.size;
}

async function loadPendingApprovalMovies(strapi) {
  const rows = await strapi.entityService.findMany('api::movie.movie', {
    filters: {
      pending_event_group_code: { $notNull: true },
    },
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
    publicationState: 'preview',
    pagination: { pageSize: 200 },
    sort: ['title:asc'],
  });
  const list = Array.isArray(rows) ? rows : [];
  return list
    .filter((m) => String(m.pending_event_group_code || '').trim())
    .map((m) => ({
      movieId: m.id,
      cmsTitle: m.title ?? '',
      cmsOriginalTitle: m.original_title ?? '',
      cmsSlug: m.slug ?? '',
      cmsEventGroupCode: m.event_group_code || null,
      suggestedEventGroupCode: String(m.pending_event_group_code).trim(),
      moreTitle: m.pending_more_title || null,
      score: Number(m.pending_match_score) || 0,
    }));
}

/**
 * Έγκριση προτεινόμενου event_group_code → εγγραφή στο CMS.
 */
async function approveMoreEventGroupCode(strapi, { movieId, eventGroupCode, overwriteExisting = false }) {
  const id = Number(movieId);
  if (!Number.isFinite(id)) {
    throw new Error('Άκυρο movieId');
  }

  const movie = await strapi.entityService.findOne('api::movie.movie', id, {
    fields: ['id', 'title', 'event_group_code', 'pending_event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
  });
  if (!movie) throw new Error('Η ταινία δεν βρέθηκε');

  const code = String(
    eventGroupCode || movie.pending_event_group_code || '',
  ).trim();
  if (!code) throw new Error('Λείπει event_group_code προς έγκριση');

  const existingCodes = collectEventGroupCodes(movie);
  const existing = String(movie.event_group_code || '').trim();

  if (existingCodes.includes(code)) {
    await clearMoviePending(strapi, id);
    return {
      ok: true,
      movieId: id,
      cmsTitle: movie.title,
      eventGroupCode: code,
      previousCode: existing || null,
      alreadyPresent: true,
    };
  }

  if (existing && existing !== code && !overwriteExisting) {
    const moreGroups = (movie.more_event_groups || []).map((group) => ({
      code: String(group.code || '').trim(),
    })).filter((group) => group.code);
    moreGroups.push({ code });

    await strapi.entityService.update('api::movie.movie', id, {
      data: {
        more_event_groups: moreGroups,
        pending_event_group_code: null,
        pending_more_title: null,
        pending_match_score: null,
      },
    });

    return {
      ok: true,
      movieId: id,
      cmsTitle: movie.title,
      eventGroupCode: code,
      previousCode: existing || null,
      addedAsSecondary: true,
    };
  }

  await strapi.entityService.update('api::movie.movie', id, {
    data: {
      event_group_code: code,
      pending_event_group_code: null,
      pending_more_title: null,
      pending_match_score: null,
    },
  });

  return {
    ok: true,
    movieId: id,
    cmsTitle: movie.title,
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
  const movies = catalog.filter((e) => e.kind === 'movie');
  const venueBundles = catalog.filter((e) => e.kind === 'venue_bundle');

  let catalogRows = movies;
  if (query?.trim()) {
    catalogRows = filterMoreMovies(movies, query);
  } else if (listAll) {
    catalogRows = movies;
  } else if (!matchCms) {
    catalogRows = movies.slice(0, catalogLimit);
  }

  const result = {
    ok: true,
    at: new Date().toISOString(),
    durationMs: 0,
    stats: {
      moreMovies: movies.length,
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
    const cmsMovies = await loadCmsMovies(strapi);
    const rawMatches = matchMoviesToMore(cmsMovies, movies, minScore);

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
      const hasSuggested = movieHasEventGroupCode(row.cms, suggestedCode);
      return {
        movieId: row.cms.id,
        cmsTitle: row.cms.title,
        cmsOriginalTitle: row.cms.originalTitle,
        cmsSlug: row.cms.slug,
        cmsEventGroupCode: cmsCode,
        cmsEventGroupCodes: cmsCodes,
        moreTitle: row.more?.title ?? null,
        suggestedEventGroupCode: suggestedCode,
        moreUrl: row.more?.moreUrl ?? null,
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
        movieId: r.movieId,
        cmsTitle: r.cmsTitle,
        cmsOriginalTitle: r.cmsOriginalTitle,
      }));

    result.stats.cmsMovies = cmsMovies.length;
    result.stats.matched = result.matches.filter((r) => r.matched).length;
    result.stats.pendingApproval = result.pendingApproval.length;
    result.stats.unmatched = result.unmatched.length;
    result.stats.withExistingCode = result.matches.filter((r) => r.cmsEventGroupCode).length;

    if (syncPending) {
      await syncPendingApprovals(strapi, result.matches, applyMinScore);
      result.pendingApproval = await loadPendingApprovalMovies(strapi);
      result.stats.pendingApproval = result.pendingApproval.length;
    }
  }

  if (!matchCms || query?.trim() || listAll) {
    const withVerify = await attachVerification(
      catalogRows.map((e) => ({
        moreTitle: e.title,
        eventGroupCode: e.code,
        moreUrl: e.moreUrl,
        kind: e.kind,
      })),
      skipVerify,
    );
    result.catalog = withVerify;
    result.stats.catalogShown = withVerify.length;
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
        movieId: row.movieId,
        cmsTitle: row.cmsTitle,
        suggestedEventGroupCode: row.suggestedEventGroupCode,
        cmsEventGroupCode: row.cmsEventGroupCode,
        score: row.score,
        reason,
      });
      continue;
    }

    const code = row.suggestedEventGroupCode;
    const existingOwner = codeTakenBy.get(code);
    if (existingOwner != null && existingOwner !== row.movieId) {
      skipped.push({
        movieId: row.movieId,
        cmsTitle: row.cmsTitle,
        suggestedEventGroupCode: code,
        score: row.score,
        reason: 'duplicate_code',
      });
      continue;
    }

    try {
      await strapi.entityService.update('api::movie.movie', row.movieId, {
        data: { event_group_code: code },
      });
      codeTakenBy.set(code, row.movieId);
      await clearMoviePending(strapi, row.movieId);
      applied.push({
        movieId: row.movieId,
        cmsTitle: row.cmsTitle,
        moreTitle: row.moreTitle,
        eventGroupCode: code,
        previousCode: row.cmsEventGroupCode || null,
        score: row.score,
      });
    } catch (e) {
      skipped.push({
        movieId: row.movieId,
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
    message: `Ενημερώθηκαν ${applied.length} ταινίες · παραλείφθηκαν ${skipped.length}`,
  };
}

module.exports = {
  DEFAULT_MIN_SCORE,
  DEFAULT_APPLY_MIN_SCORE,
  MIN_HINT_SCORE,
  fetchMoreCatalog,
  verifyEventGroupCode,
  runMoreEventCodeLookup,
  applyMoreEventCodeMatches,
  approveMoreEventGroupCode,
  loadPendingApprovalMovies,
  clearMoviePending,
  needsApproval,
  normalizeText,
  filterMoreMovies,
  matchMoviesToMore,
  scoreMatch,
};
