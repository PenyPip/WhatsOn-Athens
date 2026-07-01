'use strict';

const { fetchMoreEventsByGroupCode } = require('./moreApi');
const {
  collectEventGroupCodes,
  collectVenueBundleCodes,
  collectVenueSupplementalMovieCodes,
  collectVenueAllSyncCodes,
  collectTheaterVenueBundleCodes,
  isVenueBundleCode,
  normalizeMoreVenueId,
  moreVenueIdLookupKeys,
} = require('./moreEventGroupCodes');
const {
  createVenueScrapeCache,
  SCRAPE_ENABLED,
  SCRAPE_ON_SYNC,
  BUNDLE_SYNC_SCRAPE_ENABLED,
  resolveVenueMoreProgramLink,
  loadVenueScrapeWithFallback,
  lookupScrapedEventRow,
} = require('./moreVenueProgramScrape');
const { findBestCmsMatchByPlayTitle, mapCmsRowForPlayTitleMatch } = require('./morePlayTitleMatch');
const {
  createEventIdPersistQueue,
  loadPersistedCinemaEventIdsIntoIndex,
  loadPersistedTheaterEventIdsIntoIndex,
  queueScrapeMappingForPersist,
  flushEventIdPersistQueue,
} = require('./moreEventIdPersist');
const {
  createVenueSyncStatsTracker,
  applyCinemaVenueUpdatedStatuses,
  migrateVenueUpdatedBooleanToEnum,
  VENUE_UPDATED_STATUS,
} = require('../api/venue/services/venue-updated-status');
const { isDatetimeInTargetCinemaWeekForVenueStatus } = require('./cinemaWeek');
const { buildMoreImportTrace } = require('./moreImportTrace');

const MOVIE_FETCH_DELAY_MS = Number(process.env.MORE_SHOWTIME_SYNC_DELAY_MS || 40);
const EVENTS_CACHE_MAX = Number(process.env.MORE_SHOWTIME_SYNC_EVENTS_CACHE_MAX || 512);
const MOVIE_BATCH_SIZE = Number(process.env.MORE_SHOWTIME_SYNC_MOVIE_BATCH || 8);
const THEATER_BATCH_SIZE = Number(process.env.MORE_SHOWTIME_SYNC_THEATER_BATCH || 8);
/** Παράλληλο prefetch κωδικών More πριν το loop — false μόνο σε πολύ περιορισμένη RAM. */
const PREFETCH_ENABLED = process.env.MORE_SHOWTIME_SYNC_PREFETCH !== 'false';
const REPORT_DETAIL_MAX = Number(process.env.MORE_SHOWTIME_SYNC_REPORT_DETAIL_MAX || 80);

function maybeGc() {
  if (typeof global.gc === 'function') global.gc();
}

function compactSyncErrorMessage(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  const dataTooLong = s.match(/Data too long for column '([^']+)'/i);
  if (dataTooLong) {
    return `Πολύ μεγάλη τιμή για το πεδίο «${dataTooLong[1]}»`;
  }
  if (/Duplicate entry/i.test(s)) {
    return 'Διπλότυπη εγγραφή (unique constraint)';
  }

  const parts = s.split(' - ');
  const tail = parts[parts.length - 1]?.trim() || '';
  if (tail && tail.length < 240 && !/^insert into/i.test(tail)) {
    if (tail !== s) return compactSyncErrorMessage(tail);
    return tail;
  }

  if (/^insert into/i.test(s) && s.length > 120) {
    return compactSyncErrorMessage(tail) || 'Σφάλμα εγγραφής στη βάση';
  }

  return s.length > 240 ? `${s.slice(0, 237)}…` : s;
}

function pushSyncError(report, dedup, entry) {
  if (!Array.isArray(report.errors)) report.errors = [];
  const msg = compactSyncErrorMessage(entry.error || entry.message || '');
  const key = [
    entry.action,
    entry.venueType,
    entry.name || entry.title,
    entry.moreVenueId,
    entry.movieId,
    entry.theaterShowId,
    entry.venueId,
    entry.code,
    msg,
  ]
    .filter((v) => v != null && v !== '')
    .join('|');
  if (dedup.has(key)) return;
  dedup.add(key);
  report.errors.push({ ...entry, error: msg });
}

/** Κατά sync: δημιουργία χώρου από More αν λείπει (venueId / venueName). */
const AUTO_CREATE_THEATER_VENUES = process.env.MORE_THEATER_SYNC_AUTO_CREATE_VENUES !== 'false';
const AUTO_CREATE_CINEMA_VENUES = process.env.MORE_CINEMA_SYNC_AUTO_CREATE_VENUES !== 'false';

const VENUE_AUTO_CREATE = {
  theater: {
    isEnabled: () => AUTO_CREATE_THEATER_VENUES,
    venueType: 'theater',
    defaultNamePrefix: 'Θέατρο More',
    info: 'Αυτόματη δημιουργία από More theater sync.',
    slugPrefix: 'theater',
    countKey: 'createdTheaterVenues',
    listKey: 'createdTheaterVenuesList',
    logTag: 'more-theater-sync',
  },
  cinema: {
    isEnabled: () => AUTO_CREATE_CINEMA_VENUES,
    venueType: 'cinema',
    defaultNamePrefix: 'Σινεμά More',
    info: 'Αυτόματη δημιουργία από More cinema sync.',
    slugPrefix: 'cinema',
    countKey: 'createdCinemaVenues',
    listKey: 'createdCinemaVenuesList',
    logTag: 'more-cinema-sync',
  },
};

/** More eventDate συχνά χωρίς timezone — θεωρούμε ώρα Αθήνας (+03:00). */
function parseMoreEventDatetime(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const clean = s.replace(/\.\d+$/, '');
  const d = new Date(`${clean}+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Προβολές εβδομάδας-στόχου για venue.updated (Δευ–Τετ: επόμενη Πέμπτη, Πέμ–Κυρ: τρέχουσα). */
function moreEventInTargetCinemaWeekForVenueStatus(event, now) {
  return isDatetimeInTargetCinemaWeekForVenueStatus(parseMoreEventDatetime(event?.eventDate), now);
}

function weekSyncOutcomeFromUpsert(result) {
  return result === 'created' || result === 'exists' ? 'synced' : 'failed';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function yieldEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function createEventsCache(fetchDelayMs, fetchProgress) {
  const cache = new Map();
  const fetchProgressFn = typeof fetchProgress === 'function' ? fetchProgress : null;

  function trimCache() {
    while (cache.size > EVENTS_CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  async function fetchAndStore(key, { skipTrim = false } = {}) {
    let events = [];
    try {
      events = await fetchMoreEventsByGroupCode(key);
    } catch (e) {
      const msg = e?.message || String(e);
      console.warn(`[more-showtime-sync] getevents failed (${key}): ${msg}`);
      events = [];
    }
    cache.set(key, events);
    if (!skipTrim) trimCache();
    return events;
  }

  return {
    size() {
      return cache.size;
    },
    has(code) {
      const key = String(code || '').trim();
      return Boolean(key && cache.has(key));
    },
    clear() {
      cache.clear();
    },
    async get(code) {
      const key = String(code || '').trim();
      if (!key) return [];
      if (cache.has(key)) return cache.get(key);
      if (fetchProgressFn) fetchProgressFn(key);
      const events = await fetchAndStore(key);
      if (fetchDelayMs > 0) await sleep(fetchDelayMs);
      if (cache.size % 8 === 0) await yieldEventLoop();
      return events;
    },
    /** Παράλληλο prefetch μοναδικών κωδικών — πολύ πιο γρήγορο από σειριακό sync. */
    async prefetchAll(codes, options = {}) {
      const concurrency = Number(
        options.concurrency ?? process.env.MORE_SHOWTIME_SYNC_CONCURRENCY ?? 4,
      );
      const delayMs = Number(options.delayMs ?? fetchDelayMs);
      const unique = [
        ...new Set((codes || []).map((c) => String(c || '').trim()).filter(Boolean)),
      ];
      if (!unique.length) return { total: 0, fetched: 0 };

      let cursor = 0;
      let fetched = 0;

      let lastProgressAt = 0;
      async function worker() {
        while (cursor < unique.length) {
          const idx = cursor;
          cursor += 1;
          const key = unique[idx];
          if (!key || cache.has(key)) continue;
          await fetchAndStore(key, { skipTrim: true });
          fetched += 1;
          if (typeof options.onProgress === 'function' && fetched - lastProgressAt >= 8) {
            lastProgressAt = fetched;
            options.onProgress(`More API: ${fetched}/${unique.length} κωδικοί…`);
          }
          if (delayMs > 0) await sleep(delayMs);
          if (fetched % 12 === 0) await yieldEventLoop();
        }
      }

      const workers = Math.min(Math.max(1, concurrency), unique.length);
      await Promise.all(Array.from({ length: workers }, () => worker()));
      trimCache();
      return { total: unique.length, fetched };
    },
  };
}

async function findAllEntities(strapi, uid, options = {}) {
  const pageSize = Math.min(Math.max(1, options.pageSize ?? 100), 250);
  const maxRecords = options.maxRecords ?? 10_000;
  const maxPages = options.maxPages ?? Math.ceil(maxRecords / pageSize) + 1;
  const onPageProgress = options.onPageProgress;
  const progressLabel = options.progressLabel;
  const base = { ...options };
  delete base.pageSize;
  delete base.maxRecords;
  delete base.maxPages;
  delete base.onPageProgress;
  delete base.progressLabel;

  let totalExpected = null;
  try {
    totalExpected = await strapi.entityService.count(uid, { filters: base.filters });
  } catch {
    // count optional
  }

  const seenIds = new Set();
  const all = [];
  let start = 0;

  const queryBase =
    base.sort != null ? base : { ...base, sort: { id: 'asc' } };

  for (let pageNum = 0; pageNum < maxPages; pageNum += 1) {
    const rows = await strapi.entityService.findMany(uid, {
      ...queryBase,
      pagination: { start, limit: pageSize },
    });
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) break;

    let addedThisPage = 0;
    for (const row of list) {
      const id = row?.id;
      if (id != null) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      all.push(row);
      addedThisPage += 1;
    }

    if (typeof onPageProgress === 'function') {
      const label = progressLabel || uid;
      const totalHint =
        totalExpected != null ? ` / ~${totalExpected}` : '';
      onPageProgress(`${label}: ${all.length}${totalHint} (offset ${start})…`);
    }

    if (all.length >= maxRecords) {
      throw new Error(
        `[more-showtime-sync] Υπερβολικά αποτελέσματα (${all.length}+) για ${uid} — πιθανό bug pagination. Σταμάτησε στο offset ${start}.`,
      );
    }

    // Κενή σελίδα ή μόνο duplicates ή τελευταία σελίδα
    if (addedThisPage === 0 || list.length < pageSize) break;
    if (totalExpected != null && all.length >= totalExpected) break;

    start += pageSize;
    if (pageNum % 3 === 2) await yieldEventLoop();
  }

  return all;
}

function normalizeVenueName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function buildVenueLookup(venues) {
  const byMoreId = new Map();
  const byName = new Map();

  for (const venue of venues) {
    const moreId = normalizeMoreVenueId(venue.venue_id);
    if (moreId) {
      byMoreId.set(moreId, venue);
      const asNum = Number(moreId);
      if (Number.isFinite(asNum)) byMoreId.set(String(asNum), venue);
    }
    const nameKey = normalizeVenueName(venue.name);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, venue);
  }

  return { byMoreId, byName };
}

function resolveVenueFromMoreEvent(lookup, event) {
  const moreVenueId = normalizeMoreVenueId(event?.venueId);
  if (moreVenueId) {
    const byId = lookup.byMoreId.get(moreVenueId);
    if (byId) return byId;
  }
  const nameKey = normalizeVenueName(event?.venueName);
  if (nameKey) {
    return lookup.byName.get(nameKey) ?? null;
  }
  return null;
}

function registerVenueInLookup(lookup, venue) {
  const moreId = normalizeMoreVenueId(venue?.venue_id);
  if (moreId) {
    lookup.byMoreId.set(moreId, venue);
    const asNum = Number(moreId);
    if (Number.isFinite(asNum)) lookup.byMoreId.set(String(asNum), venue);
  }
  const nameKey = normalizeVenueName(venue?.name);
  if (nameKey) lookup.byName.set(nameKey, venue);
}

function buildVenueDataFromMoreEvent(event, config) {
  const moreVenueId = normalizeMoreVenueId(event?.venueId);
  const name = String(event?.venueName || '').trim();
  const venueName = name || (moreVenueId ? `${config.defaultNamePrefix} ${moreVenueId}` : '');

  const data = {
    name: venueName,
    type: config.venueType,
    // Αυτόματη δημιουργία από sync → μένει draft (unpublished) ακόμη κι αν έχει προβολές/παραστάσεις.
    publishedAt: null,
    info: config.info,
  };
  if (moreVenueId) data.venue_id = moreVenueId;
  if (config.venueType === 'cinema' && /θεριν|summer/i.test(venueName)) {
    data.summer_outdoor = true;
  }

  // Χωρίς google_maps_url: οι διευθύνσεις/χάρτες από το More είναι συχνά λάθος → τα βάζει admin χειροκίνητα.

  return { data, moreVenueId, venueName };
}

const GREEK_TO_LATIN = {
  α: 'a', ά: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', έ: 'e', ζ: 'z', η: 'i', ή: 'i',
  θ: 'th', ι: 'i', ί: 'i', ϊ: 'i', ΐ: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x',
  ο: 'o', ό: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', ύ: 'y', ϋ: 'y',
  ΰ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o', ώ: 'o',
};

/** Slug από όνομα χώρου (μεταγραφή ελληνικών → λατινικά)· ποτέ με venue_id. */
function slugifyVenueName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => GREEK_TO_LATIN[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Βρίσκει χώρο που υπάρχει ήδη με ίδιο όνομα (αποφυγή διπλότυπων). */
async function findVenueByName(strapi, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    filters: { name: { $eqi: trimmed } },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'type'],
    publicationState: 'preview',
    limit: 1,
  });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function findVenueByMoreId(strapi, moreVenueId) {
  const keys = moreVenueIdLookupKeys(moreVenueId);
  if (!keys.length) return null;
  // Global έλεγχος venue_id (ανεξαρτήτως type): το More venueId είναι μοναδικό ανά φυσικό χώρο.
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    filters: { $or: keys.map((key) => ({ venue_id: key })) },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'type'],
    publicationState: 'preview',
    limit: 1,
  });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/** Ελαφρύ load χώρων (lookup + presence) — χωρίς populate components. */
async function loadAllVenuesForSync(strapi, onPageProgress) {
  return findAllEntities(strapi, 'api::venue.venue', {
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'type'],
    publicationState: 'preview',
    pageSize: 100,
    maxRecords: 2000,
    progressLabel: 'Χώροι CMS',
    onPageProgress,
  });
}

/** Μόνο χώροι με bundle codes (populate more_event_groups) — ξεχωριστό, μικρότερο scan. */
async function loadVenueBundleRows(strapi, venueType, onPageProgress) {
  const filters = venueType === 'cinema' ? { type: 'cinema' } : { type: { $ne: 'cinema' } };
  const label = venueType === 'cinema' ? 'Σινεμά bundles' : 'Θέατρο bundles';
  return findAllEntities(strapi, 'api::venue.venue', {
    filters,
    fields: [
      'id',
      'name',
      'slug',
      'venue_id',
      'summer_outdoor',
      'type',
      'event_group_code',
      'more_link',
      'updated',
    ],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pageSize: 50,
    maxRecords: 400,
    progressLabel: label,
    onPageProgress,
  });
}

function venuesWithBundleFromRows(rows, collectBundleFn, { onlyWithBundles = true } = {}) {
  const mapped = rows.map((venue) => ({
    ...venue,
    bundleCodes: collectBundleFn(venue),
  }));
  return onlyWithBundles ? mapped.filter((venue) => venue.bundleCodes.length > 0) : mapped;
}

function registerVenueInPresenceIndex(index, venue) {
  if (!index || !venue) return;
  for (const key of moreVenueIdLookupKeys(venue?.venue_id)) index.byMoreId.add(key);
  const nameKey = normalizeVenueName(venue?.name);
  if (nameKey) index.byName.add(nameKey);
}

function buildVenuePresenceIndexFromRows(rows) {
  const byMoreId = new Set();
  const byName = new Set();
  for (const row of rows) {
    for (const key of moreVenueIdLookupKeys(row?.venue_id)) byMoreId.add(key);
    const nameKey = normalizeVenueName(row?.name);
    if (nameKey) byName.add(nameKey);
  }
  return { byMoreId, byName };
}

function isVenueMissingFromPresenceIndex(event, index) {
  if (!index) return true;
  const moreVenueId = normalizeMoreVenueId(event?.venueId);
  if (moreVenueId) {
    for (const key of moreVenueIdLookupKeys(moreVenueId)) {
      if (index.byMoreId.has(key)) return false;
    }
  }
  const venueName = String(event?.venueName || '').trim();
  if (venueName) {
    const nameKey = normalizeVenueName(venueName);
    if (nameKey && index.byName.has(nameKey)) return false;
  }
  return true;
}

async function createVenueFromMore(strapi, event, report, config, errorDedup) {
  const { data, moreVenueId, venueName } = buildVenueDataFromMoreEvent(event, config);
  if (!venueName) return null;

  if (!Array.isArray(report[config.listKey])) report[config.listKey] = [];
  if (typeof report[config.countKey] !== 'number') report[config.countKey] = 0;

  // Slug από το όνομα (μεταγραφή ελληνικών)· αν λείπει, fallback στο slugPrefix.
  const baseSlug = slugifyVenueName(venueName) || config.slugPrefix;

  const recordCreated = (created, note) => {
    report[config.countKey] += 1;
    report[config.listKey].push({
      id: created.id,
      name: created.name,
      slug: created.slug,
      moreVenueId: moreVenueId || null,
    });
    strapi.log.info(
      `[${config.logTag}] created venue ${created.id} ${created.name}${note ? ` (${note})` : ''} (moreVenueId=${moreVenueId || '—'})`,
    );
  };

  try {
    const created = await strapi.entityService.create('api::venue.venue', {
      data: { ...data, slug: baseSlug },
    });
    recordCreated(created);
    return created;
  } catch (e) {
    const msg = e?.message || String(e);
    if (!/unique|slug|already exists/i.test(msg)) {
      pushSyncError(report, errorDedup, {
        action: 'create_venue',
        venueType: config.venueType,
        moreVenueId,
        name: venueName,
        error: msg,
      });
      return null;
    }

    // Slug conflict = υπάρχει ήδη χώρος με το ίδιο όνομα → reuse αντί για διπλότυπο.
    const existingByName = await findVenueByName(strapi, venueName);
    if (existingByName) {
      if (moreVenueId && !normalizeMoreVenueId(existingByName.venue_id)) {
        try {
          await strapi.entityService.update('api::venue.venue', existingByName.id, {
            data: { venue_id: moreVenueId },
          });
          existingByName.venue_id = moreVenueId;
        } catch (eUpd) {
          strapi.log.warn(
            `[${config.logTag}] backfill venue_id απέτυχε για ${existingByName.id}: ${eUpd?.message || eUpd}`,
          );
        }
      }
      strapi.log.info(
        `[${config.logTag}] reuse existing venue ${existingByName.id} ${existingByName.name} (moreVenueId=${moreVenueId || '—'})`,
      );
      return existingByName;
    }

    // Δεν ταυτίστηκε με όνομα (διαφορετικός χώρος, ίδιο slug) → name-based slug με αριθμητικό suffix.
    for (let i = 2; i <= 50; i += 1) {
      try {
        const created = await strapi.entityService.create('api::venue.venue', {
          data: { ...data, slug: `${baseSlug}-${i}` },
        });
        recordCreated(created, `slug suffix -${i}`);
        return created;
      } catch (eRetry) {
        if (!/unique|slug|already exists/i.test(eRetry?.message || String(eRetry))) {
          pushSyncError(report, errorDedup, {
            action: 'create_venue',
            venueType: config.venueType,
            moreVenueId,
            name: venueName,
            error: eRetry?.message || String(eRetry),
          });
          return null;
        }
      }
    }

    pushSyncError(report, errorDedup, {
      action: 'create_venue',
      venueType: config.venueType,
      moreVenueId,
      name: venueName,
      error: `Αδύνατη δημιουργία μοναδικού slug από «${venueName}» (${baseSlug})`,
    });
    return null;
  }
}

/**
 * Επιστρέφει venue από lookup ή το δημιουργεί από More event.
 * @param {Map<string, Promise<object|null>>} pendingVenueCreates
 */
async function ensureVenueFromMoreEvent(
  strapi,
  lookup,
  event,
  report,
  pendingVenueCreates,
  failedVenueKeys,
  errorDedup,
  config,
) {
  const existing = resolveVenueFromMoreEvent(lookup, event);
  if (existing) return existing;

  if (!config.isEnabled()) return null;

  const moreVenueId = normalizeMoreVenueId(event?.venueId);
  const nameKey = normalizeVenueName(event?.venueName);
  const pendingKey = `${config.venueType}:${moreVenueId || (nameKey ? `name:${nameKey}` : '')}`;
  if (pendingKey === `${config.venueType}:`) return null;

  if (failedVenueKeys.has(pendingKey)) {
    // Μπορεί να προστέθηκε venue_id στο CMS μετά την πρώτη αποτυχία — ξαναέλεγξε DB.
    if (moreVenueId) {
      const retry = await findVenueByMoreId(strapi, moreVenueId);
      if (retry) {
        registerVenueInLookup(lookup, retry);
        failedVenueKeys.delete(pendingKey);
        return retry;
      }
    }
    const retryName = String(event?.venueName || '').trim();
    if (retryName) {
      const byName = await findVenueByName(strapi, retryName);
      if (byName) {
        registerVenueInLookup(lookup, byName);
        failedVenueKeys.delete(pendingKey);
        return byName;
      }
    }
    return null;
  }

  if (pendingVenueCreates.has(pendingKey)) {
    return pendingVenueCreates.get(pendingKey);
  }

  const promise = (async () => {
    if (moreVenueId) {
      const fromDb = await findVenueByMoreId(strapi, moreVenueId);
      if (fromDb) {
        registerVenueInLookup(lookup, fromDb);
        return fromDb;
      }
    }

    // Έλεγχος ονόματος στη DB → αποφυγή διπλότυπου χώρου που υπάρχει ήδη.
    const venueName = String(event?.venueName || '').trim();
    if (venueName) {
      const byName = await findVenueByName(strapi, venueName);
      if (byName) {
        if (moreVenueId && !normalizeMoreVenueId(byName.venue_id)) {
          try {
            await strapi.entityService.update('api::venue.venue', byName.id, {
              data: { venue_id: moreVenueId },
            });
            byName.venue_id = moreVenueId;
          } catch (e) {
            strapi.log.warn(
              `[${config.logTag}] backfill venue_id απέτυχε για ${byName.id}: ${e?.message || e}`,
            );
          }
        }
        registerVenueInLookup(lookup, byName);
        return byName;
      }
    }

    const created = await createVenueFromMore(strapi, event, report, config, errorDedup);
    if (created) {
      registerVenueInLookup(lookup, created);
    } else {
      failedVenueKeys.add(pendingKey);
    }
    return created;
  })();

  pendingVenueCreates.set(pendingKey, promise);
  try {
    return await promise;
  } finally {
    pendingVenueCreates.delete(pendingKey);
  }
}

function ensureTheaterVenueFromMoreEvent(
  strapi,
  lookup,
  event,
  report,
  pendingVenueCreates,
  failedVenueKeys,
  errorDedup,
) {
  return ensureVenueFromMoreEvent(
    strapi,
    lookup,
    event,
    report,
    pendingVenueCreates,
    failedVenueKeys,
    errorDedup,
    VENUE_AUTO_CREATE.theater,
  );
}

function ensureCinemaVenueFromMoreEvent(
  strapi,
  lookup,
  event,
  report,
  pendingVenueCreates,
  failedVenueKeys,
  errorDedup,
) {
  return ensureVenueFromMoreEvent(
    strapi,
    lookup,
    event,
    report,
    pendingVenueCreates,
    failedVenueKeys,
    errorDedup,
    VENUE_AUTO_CREATE.cinema,
  );
}

async function loadVenueByMoreId(strapi, venueType) {
  const filters = {
    venue_id: { $notNull: true },
  };
  if (venueType) {
    filters.type = venueType;
  }
  const rows = await findAllEntities(strapi, 'api::venue.venue', {
    filters,
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'type'],
    publicationState: 'preview',
    pageSize: 200,
  });
  return buildVenueLookup(rows.filter((v) => normalizeMoreVenueId(v.venue_id)));
}

async function loadMoviesWithCodes(strapi, movieIdFilter) {
  if (movieIdFilter != null) {
    return loadMoviesWithCodesPage(strapi, { page: 1, pageSize: 1, movieIdFilter });
  }
  const all = [];
  for (let page = 1; ; page += 1) {
    const batch = await loadMoviesWithCodesPage(strapi, { page, pageSize: 200 });
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 200) break;
    await yieldEventLoop();
  }
  return all;
}

async function loadMoviesWithCodesPage(strapi, { page, pageSize, movieIdFilter }) {
  const filters = {};
  if (movieIdFilter != null) filters.id = movieIdFilter;
  const limit = Math.min(Math.max(1, pageSize), 250);
  const start = Math.max(0, (Math.max(1, page) - 1) * limit);
  const rows = await strapi.entityService.findMany('api::movie.movie', {
    filters,
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    sort: { id: 'asc' },
    pagination: { start, limit },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((m) => collectEventGroupCodes(m).length > 0);
}

function movieSyncCodeEntityFilters() {
  return {
    $or: [
      { event_group_code: { $notNull: true, $ne: '' } },
      { more_event_groups: { code: { $notNull: true, $ne: '' } } },
    ],
  };
}

function theaterShowSyncCodeEntityFilters() {
  return movieSyncCodeEntityFilters();
}

/** Γρήγορο SQL: μόνο ids με event_group_code ή more_event_groups — όχι full-table scan. */
async function queryEntityIdsWithSyncCodesKnex(strapi, {
  entityTable,
  linkTable,
  componentTable,
  componentField = 'more_event_groups',
}) {
  const knex = strapi.db.connection;
  const ids = new Set();

  const primaryRows = await knex(entityTable)
    .whereNotNull('event_group_code')
    .where('event_group_code', '!=', '')
    .select('id');
  for (const row of primaryRows) {
    if (row?.id != null) ids.add(row.id);
  }

  const hasLink = await knex.schema.hasTable(linkTable);
  const hasComponent = await knex.schema.hasTable(componentTable);
  if (hasLink && hasComponent) {
    const componentRows = await knex(`${linkTable} as mc`)
      .join(`${componentTable} as g`, 'mc.component_id', 'g.id')
      .where('mc.field', componentField)
      .whereNotNull('g.code')
      .where('g.code', '!=', '')
      .distinct(knex.ref('mc.entity_id').as('id'));
    for (const row of componentRows) {
      if (row?.id != null) ids.add(row.id);
    }
  }

  return [...ids].sort((a, b) => Number(a) - Number(b));
}

async function queryMovieIdsWithSyncCodes(strapi) {
  return queryEntityIdsWithSyncCodesKnex(strapi, {
    entityTable: 'movies',
    linkTable: 'movies_components',
    componentTable: 'components_cinema_more_event_groups',
  });
}

async function queryTheaterShowIdsWithSyncCodes(strapi) {
  return queryEntityIdsWithSyncCodesKnex(strapi, {
    entityTable: 'theater_shows',
    linkTable: 'theater_shows_components',
    componentTable: 'components_cinema_more_event_groups',
  });
}

function mapRowsToSyncCodeEntries(rows) {
  const list = [];
  for (const entry of rows) {
    const codes = collectEventGroupCodes(entry);
    if (!codes.length) continue;
    list.push({
      id: entry.id,
      title: entry.title,
      slug: entry.slug,
      codes,
      ordinal: list.length + 1,
    });
  }
  return list;
}

/** Σάρωση CMS: μόνο ταινίες με event_group_code / more_event_groups (όχι ολόκληρος κατάλογος). */
async function listMoviesWithSyncCodes(strapi, onPageProgress) {
  if (typeof onPageProgress === 'function') {
    onPageProgress('Σάρωση CMS: ταινίες με More κωδικό…');
  }

  let rows = [];
  try {
    const ids = await queryMovieIdsWithSyncCodes(strapi);
    rows = await loadMoviesByIds(strapi, ids);
    if (typeof onPageProgress === 'function') {
      onPageProgress(`Σάρωση CMS: ${rows.length} ταινίες με More κωδικό (από ${ids.length} ids)…`);
    }
  } catch (e) {
    strapi.log.warn(`[more-showtime-sync] queryMovieIdsWithSyncCodes: ${e?.message || e}`);
    rows = await findAllEntities(strapi, 'api::movie.movie', {
      filters: movieSyncCodeEntityFilters(),
      fields: ['id', 'title', 'slug', 'event_group_code'],
      populate: { more_event_groups: true },
      publicationState: 'preview',
      pageSize: 100,
      maxRecords: 2000,
      progressLabel: 'Ταινίες με More κωδικό',
      onPageProgress,
    });
  }

  const list = mapRowsToSyncCodeEntries(rows);
  if (typeof onPageProgress === 'function') {
    onPageProgress(`Σάρωση CMS: ${list.length} ταινίες με More κωδικό`);
  }
  return list;
}

/** Σάρωση CMS: μόνο παραστάσεις με event_group_code / more_event_groups (όχι ολόκληρος κατάλογος). */
async function listTheaterShowsWithSyncCodes(strapi, onPageProgress) {
  if (typeof onPageProgress === 'function') {
    onPageProgress('Σάρωση CMS: παραστάσεις με More κωδικό…');
  }

  let rows = [];
  try {
    const ids = await queryTheaterShowIdsWithSyncCodes(strapi);
    rows = await loadTheaterShowsByIds(strapi, ids);
    if (typeof onPageProgress === 'function') {
      onPageProgress(
        `Σάρωση CMS: ${rows.length} παραστάσεις με More κωδικό (από ${ids.length} ids)…`,
      );
    }
  } catch (e) {
    strapi.log.warn(`[more-showtime-sync] queryTheaterShowIdsWithSyncCodes: ${e?.message || e}`);
    rows = await findAllEntities(strapi, 'api::theater-show.theater-show', {
      filters: theaterShowSyncCodeEntityFilters(),
      fields: ['id', 'title', 'slug', 'event_group_code'],
      populate: { more_event_groups: true },
      publicationState: 'preview',
      pageSize: 100,
      maxRecords: 2000,
      progressLabel: 'Παραστάσεις με More κωδικό',
      onPageProgress,
    });
  }

  const list = mapRowsToSyncCodeEntries(rows);
  if (typeof onPageProgress === 'function') {
    onPageProgress(`Σάρωση CMS: ${list.length} παραστάσεις με More κωδικό`);
  }
  return list;
}

async function loadMoviesForSyncBatch(strapi, entries) {
  if (!entries?.length) return [];
  const ids = entries.map((e) => e.id);
  const rows = await loadMoviesByIds(strapi, ids);
  const meta = new Map(entries.map((e) => [e.id, e]));
  return rows.map((movie) => {
    const entry = meta.get(movie.id);
    return {
      ...movie,
      _syncOrdinal: entry?.ordinal ?? null,
      _syncCodes: entry?.codes,
    };
  });
}

async function loadMoviesByIds(strapi, ids) {
  if (!ids?.length) return [];
  const limit = Math.min(ids.length, 250);
  const rows = await strapi.entityService.findMany('api::movie.movie', {
    filters: { id: { $in: ids } },
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { start: 0, limit },
  });
  const list = Array.isArray(rows) ? rows : [];
  const byId = new Map(list.map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function loadTheaterShowsForSyncBatch(strapi, entries) {
  if (!entries?.length) return [];
  const ids = entries.map((e) => e.id);
  const rows = await loadTheaterShowsByIds(strapi, ids);
  const meta = new Map(entries.map((e) => [e.id, e]));
  return rows.map((show) => {
    const entry = meta.get(show.id);
    return {
      ...show,
      _syncOrdinal: entry?.ordinal ?? null,
      _syncCodes: entry?.codes,
    };
  });
}

async function loadTheaterShowsByIds(strapi, ids) {
  if (!ids?.length) return [];
  const limit = Math.min(ids.length, 250);
  const rows = await strapi.entityService.findMany('api::theater-show.theater-show', {
    filters: { id: { $in: ids } },
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { start: 0, limit },
  });
  const list = Array.isArray(rows) ? rows : [];
  const byId = new Map(list.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function loadTheaterShowsWithCodes(strapi, theaterShowIdFilter) {
  if (theaterShowIdFilter != null) {
    return loadTheaterShowsWithCodesPage(strapi, { page: 1, pageSize: 1, theaterShowIdFilter });
  }
  const all = [];
  for (let page = 1; ; page += 1) {
    const batch = await loadTheaterShowsWithCodesPage(strapi, { page, pageSize: 200 });
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 200) break;
    await yieldEventLoop();
  }
  return all;
}

async function loadTheaterShowsWithCodesPage(strapi, { page, pageSize, theaterShowIdFilter }) {
  const filters = {};
  if (theaterShowIdFilter != null) filters.id = theaterShowIdFilter;
  const limit = Math.min(Math.max(1, pageSize), 250);
  const start = Math.max(0, (Math.max(1, page) - 1) * limit);
  const rows = await strapi.entityService.findMany('api::theater-show.theater-show', {
    filters,
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    sort: { id: 'asc' },
    pagination: { start, limit },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((show) => collectEventGroupCodes(show).length > 0);
}

function mergeMovieSyncReports(target, source) {
  if (!source) return target;
  if (!target) return { ...source };
  const counterKeys = [
    'createdFromMovies',
    'createdFromVenues',
    'createdCinemaVenues',
    'alreadyExists',
    'skippedPast',
    'skippedNoVenue',
    'skippedUnknownEventId',
    'skippedInvalidDate',
    'resolvedViaVenueScrape',
  ];
  target.moviesScanned = (target.moviesScanned || 0) + (source.moviesScanned || 0);
  for (const key of counterKeys) {
    target[key] = (target[key] || 0) + (source[key] || 0);
  }
  target.createdCinemaVenuesList = [
    ...(target.createdCinemaVenuesList || []),
    ...(source.createdCinemaVenuesList || []),
  ];
  target.byMovie = [...(target.byMovie || []), ...(source.byMovie || [])];
  target.byVenue = [...(target.byVenue || []), ...(source.byVenue || [])];
  target.missingVenueIds = [...(target.missingVenueIds || []), ...(source.missingVenueIds || [])];
  target.errors = [...(target.errors || []), ...(source.errors || [])];
  if (source.venueUpdatedStatuses) target.venueUpdatedStatuses = source.venueUpdatedStatuses;
  if (source.note && !target.note) target.note = source.note;
  return trimReportDetailArrays(target);
}

function mergeTheaterSyncReports(target, source) {
  if (!source) return target;
  if (!target) return { ...source };
  const counterKeys = [
    'createdFromTheaterShows',
    'createdFromTheaterVenues',
    'createdTheaterVenues',
    'alreadyExists',
    'updatedSoldOut',
    'skippedPast',
    'skippedNoVenue',
    'skippedUnknownEventId',
    'skippedInvalidDate',
    'resolvedViaVenueScrape',
  ];
  target.theaterShowsScanned = (target.theaterShowsScanned || 0) + (source.theaterShowsScanned || 0);
  for (const key of counterKeys) {
    target[key] = (target[key] || 0) + (source[key] || 0);
  }
  target.createdTheaterVenuesList = [
    ...(target.createdTheaterVenuesList || []),
    ...(source.createdTheaterVenuesList || []),
  ];
  target.byTheaterShow = [...(target.byTheaterShow || []), ...(source.byTheaterShow || [])];
  target.byTheaterVenue = [...(target.byTheaterVenue || []), ...(source.byTheaterVenue || [])];
  target.missingVenueIds = [...(target.missingVenueIds || []), ...(source.missingVenueIds || [])];
  target.errors = [...(target.errors || []), ...(source.errors || [])];
  if (source.note && !target.note) target.note = source.note;
  return trimReportDetailArrays(target);
}

/**
 * Μετρά πόσες more_sync εγγραφές (προβολές + παραστάσεις) δημιουργήθηκαν στη βάση από
 * τη στιγμή `sinceMs` και μετά — ανεξάρτητη επαλήθευση του «Νέες» της αναφοράς.
 */
async function countMoreSyncCreatedSince(strapi, sinceMs) {
  const sinceIso = new Date(sinceMs).toISOString();
  const filters = {
    import_source: 'more_sync',
    createdAt: { $gte: sinceIso },
  };
  const safeCount = async (uid) => {
    try {
      return await strapi.entityService.count(uid, { filters });
    } catch (e) {
      strapi.log.warn(`[more-showtime-sync] countMoreSyncCreatedSince ${uid}: ${e?.message || e}`);
      return 0;
    }
  };
  const [showtimes, performances] = await Promise.all([
    safeCount('api::showtime.showtime'),
    safeCount('api::theater-performance.theater-performance'),
  ]);
  return { showtimes, performances, total: showtimes + performances };
}

/** Κλειδί ανά λεπτό ±1 για ταίριασμα με το ±60s window των queries. */
function showtimeMinuteKey(venueId, datetime) {
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return `${venueId}|${Math.floor(t / 60000)}`;
}

function performanceMinuteKey(theaterShowId, venueId, datetime) {
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return `${theaterShowId}|${venueId}|${Math.floor(t / 60000)}`;
}

function showtimeExistsInIndex(index, venueId, datetime) {
  if (!index?.size) return false;
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  const baseMinute = Math.floor(d.getTime() / 60000);
  for (const delta of [-1, 0, 1]) {
    if (index.has(`${venueId}|${baseMinute + delta}`)) return true;
  }
  return false;
}

function addShowtimeToExistenceIndex(index, venueId, datetime) {
  if (!index) return;
  const key = showtimeMinuteKey(venueId, datetime);
  if (key) index.add(key);
}

function findPerformanceInIndex(index, theaterShowId, venueId, datetime) {
  if (!index?.size) return null;
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  const baseMinute = Math.floor(d.getTime() / 60000);
  for (const delta of [-1, 0, 1]) {
    const key = `${theaterShowId}|${venueId}|${baseMinute + delta}`;
    if (index.has(key)) return index.get(key);
  }
  return null;
}

function setPerformanceInExistenceIndex(index, theaterShowId, venueId, datetime, entry) {
  if (!index) return;
  const key = performanceMinuteKey(theaterShowId, venueId, datetime);
  if (key) index.set(key, entry);
}

async function loadShowtimeExistenceIndex(strapi, movieIds, now) {
  const index = new Set();
  const ids = [...new Set((movieIds || []).filter((id) => id != null))];
  if (!ids.length) return index;

  const rows = await findAllEntities(strapi, 'api::showtime.showtime', {
    filters: {
      movie: { id: { $in: ids } },
      datetime: { $gte: now.toISOString() },
    },
    fields: ['datetime'],
    populate: { venue: { fields: ['id'] } },
    pageSize: 250,
    maxRecords: 80_000,
  });

  for (const row of rows) {
    const venueId = row.venue?.id ?? row.venue;
    const key = showtimeMinuteKey(venueId, row.datetime);
    if (key) index.add(key);
  }
  return index;
}

async function loadPerformanceExistenceIndex(strapi, theaterShowIds, now) {
  const index = new Map();
  const ids = [...new Set((theaterShowIds || []).filter((id) => id != null))];
  if (!ids.length) return index;

  const rows = await findAllEntities(strapi, 'api::theater-performance.theater-performance', {
    filters: {
      theater_show: { id: { $in: ids } },
      datetime: { $gte: now.toISOString() },
    },
    fields: ['id', 'datetime', 'sold_out'],
    populate: {
      venue: { fields: ['id'] },
      theater_show: { fields: ['id'] },
    },
    pageSize: 250,
    maxRecords: 80_000,
  });

  for (const row of rows) {
    const venueId = row.venue?.id ?? row.venue;
    const theaterShowId = row.theater_show?.id ?? row.theater_show;
    const key = performanceMinuteKey(theaterShowId, venueId, row.datetime);
    if (key) index.set(key, { id: row.id, sold_out: row.sold_out === true });
  }
  return index;
}

function collectCodesFromMovies(movies) {
  const codes = [];
  for (const movie of movies || []) codes.push(...collectEventGroupCodes(movie));
  return codes;
}

function collectCodesFromTheaterShows(shows) {
  const codes = [];
  for (const show of shows || []) codes.push(...collectEventGroupCodes(show));
  return codes;
}

function collectCodesFromVenueBundles(venues) {
  const codes = [];
  for (const venue of venues || []) codes.push(...(venue.bundleCodes || []));
  return codes;
}

async function prefetchEventCodes(eventsCache, codes, onProgress) {
  if (!PREFETCH_ENABLED || !eventsCache?.prefetchAll) return;
  const unique = [
    ...new Set((codes || []).map((c) => String(c || '').trim()).filter(Boolean)),
  ];
  if (!unique.length) return;
  if (onProgress) onProgress(`More API: prefetch ${unique.length} κωδικών…`);
  await eventsCache.prefetchAll(unique, { onProgress });
}

async function showtimeExistsAt(strapi, { movieId, venueId, datetime }, existenceIndex) {
  if (existenceIndex) {
    return showtimeExistsInIndex(existenceIndex, venueId, datetime);
  }
  const t = datetime.getTime();
  const rows = await strapi.entityService.findMany('api::showtime.showtime', {
    filters: {
      movie: { id: movieId },
      venue: { id: venueId },
      datetime: {
        $gte: new Date(t - 60_000).toISOString(),
        $lte: new Date(t + 60_000).toISOString(),
      },
    },
    limit: 1,
  });
  return Array.isArray(rows) && rows.length > 0;
}

function parseMoreSoldOut(event) {
  const raw = event?.soldOut ?? event?.sold_out;
  return raw === true || raw === 'true' || raw === 1;
}

async function findPerformanceAt(strapi, { theaterShowId, venueId, datetime }, existenceIndex) {
  if (existenceIndex) {
    return findPerformanceInIndex(existenceIndex, theaterShowId, venueId, datetime);
  }
  const t = datetime.getTime();
  const rows = await strapi.entityService.findMany('api::theater-performance.theater-performance', {
    filters: {
      theater_show: { id: theaterShowId },
      venue: { id: venueId },
      datetime: {
        $gte: new Date(t - 60_000).toISOString(),
        $lte: new Date(t + 60_000).toISOString(),
      },
    },
    fields: ['id', 'sold_out'],
    limit: 1,
  });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function buildEventIdIndex(items, eventsCache, mapItem) {
  const index = new Map();
  let n = 0;

  for (const item of items) {
    for (const code of collectEventGroupCodes(item)) {
      const events = await eventsCache.get(code);
      for (const event of events) {
        const eventId = String(event.eventId ?? '').trim();
        if (!eventId || index.has(eventId)) continue;
        index.set(eventId, mapItem(item));
      }
      n += 1;
      if (n % 10 === 0) await yieldEventLoop();
    }
  }

  return index;
}

/** Συμπληρώνει eventId→ταινία από όλους τους κωδικούς ταινιών (πριν venue bundle). */
async function expandCinemaEventIdIndexFromMovieCodes(index, movieCodeEntries, eventsCache, onProgress) {
  if (!index || !movieCodeEntries?.length || !eventsCache) return 0;
  let added = 0;
  for (const entry of movieCodeEntries) {
    const codes = entry.codes || [];
    for (const code of codes) {
      let events = [];
      try {
        events = await eventsCache.get(code);
      } catch {
        events = [];
      }
      for (const event of events) {
        const eventId = String(event.eventId ?? '').trim();
        if (!eventId || index.has(eventId)) continue;
        index.set(eventId, { movieId: entry.id, movieTitle: entry.title });
        added += 1;
      }
    }
  }
  if (added > 0 && typeof onProgress === 'function') {
    onProgress(`Ευρετήριο eventId: +${added} από κωδικούς ταινιών (bundle lookup)`);
  }
  return added;
}

async function upsertShowtimeFromEvent(strapi, report, {
  event,
  movieId,
  venue,
  now,
  statsTarget,
  eventGroupCode,
  syncPath,
  contentResolution,
  showtimeExistenceIndex,
}) {
  const datetime = parseMoreEventDatetime(event.eventDate);
  if (!datetime) {
    report.skippedInvalidDate += 1;
    if (statsTarget) statsTarget.skipped += 1;
    return 'invalid_date';
  }

  if (datetime < now) {
    report.skippedPast += 1;
    if (statsTarget) statsTarget.skipped += 1;
    return 'past';
  }

  const exists = await showtimeExistsAt(
    strapi,
    {
      movieId,
      venueId: venue.id,
      datetime,
    },
    showtimeExistenceIndex,
  );

  if (exists) {
    report.alreadyExists += 1;
    if (statsTarget) statsTarget.alreadyExists += 1;
    return 'exists';
  }

  await strapi.entityService.create('api::showtime.showtime', {
    data: {
      schedule_kind: 'exact',
      datetime: datetime.toISOString(),
      movie: movieId,
      venue: venue.id,
      summer_screening: venue.summer_outdoor === true,
      import_source: 'more_sync',
      import_trace: buildMoreImportTrace({
        syncPath,
        eventGroupCode,
        event,
        venue,
        contentResolution,
        contentKind: 'movie',
      }),
    },
  });

  addShowtimeToExistenceIndex(showtimeExistenceIndex, venue.id, datetime);

  report.created += 1;
  if (statsTarget) statsTarget.created += 1;
  return 'created';
}

async function upsertPerformanceFromEvent(strapi, report, {
  event,
  theaterShowId,
  venue,
  now,
  statsTarget,
  eventGroupCode,
  syncPath,
  contentResolution,
  performanceExistenceIndex,
}) {
  const datetime = parseMoreEventDatetime(event.eventDate);
  if (!datetime) {
    report.skippedInvalidDate += 1;
    if (statsTarget) statsTarget.skipped += 1;
    return 'invalid_date';
  }

  if (datetime < now) {
    report.skippedPast += 1;
    if (statsTarget) statsTarget.skipped += 1;
    return 'past';
  }

  const soldOut = parseMoreSoldOut(event);

  const existing = await findPerformanceAt(
    strapi,
    {
      theaterShowId,
      venueId: venue.id,
      datetime,
    },
    performanceExistenceIndex,
  );

  if (existing) {
    const currentSoldOut = existing.sold_out === true;
    if (currentSoldOut !== soldOut) {
      await strapi.entityService.update('api::theater-performance.theater-performance', existing.id, {
        data: { sold_out: soldOut },
      });
      setPerformanceInExistenceIndex(performanceExistenceIndex, theaterShowId, venue.id, datetime, {
        id: existing.id,
        sold_out: soldOut,
      });
      report.updatedSoldOut += 1;
      if (statsTarget) statsTarget.updatedSoldOut = (statsTarget.updatedSoldOut || 0) + 1;
      return 'updated_sold_out';
    }
    report.alreadyExists += 1;
    if (statsTarget) statsTarget.alreadyExists += 1;
    return 'exists';
  }

  const createdRow = await strapi.entityService.create('api::theater-performance.theater-performance', {
    data: {
      schedule_kind: 'exact',
      datetime: datetime.toISOString(),
      theater_show: theaterShowId,
      venue: venue.id,
      sold_out: soldOut,
      import_source: 'more_sync',
      import_trace: buildMoreImportTrace({
        syncPath,
        eventGroupCode,
        event,
        venue,
        contentResolution,
        contentKind: 'theater_show',
      }),
    },
  });

  if (createdRow?.id != null) {
    setPerformanceInExistenceIndex(performanceExistenceIndex, theaterShowId, venue.id, datetime, {
      id: createdRow.id,
      sold_out: soldOut,
    });
  }

  report.created += 1;
  if (statsTarget) statsTarget.created += 1;
  return 'created';
}

function emptySyncCounters() {
  return {
    created: 0,
    alreadyExists: 0,
    updatedSoldOut: 0,
    skippedPast: 0,
    skippedNoVenue: 0,
    skippedUnknownEventId: 0,
    skippedInvalidDate: 0,
    resolvedViaVenueScrape: 0,
    errors: [],
  };
}

async function loadCmsEntriesForPlayTitleMatch(strapi, uid, fields, contentType) {
  const scrapeTitlePool =
    BUNDLE_SYNC_SCRAPE_ENABLED || (SCRAPE_ENABLED && SCRAPE_ON_SYNC);
  if (!scrapeTitlePool) return [];
  const rows = await findAllEntities(strapi, uid, {
    fields,
    publicationState: 'preview',
    pageSize: 100,
    maxRecords: 600,
  });
  return rows.map((row) => mapCmsRowForPlayTitleMatch(row, contentType));
}

function mergeSupplementalIntoEventIdIndex(supplementalIndex, eventIdIndex) {
  if (!supplementalIndex || !eventIdIndex) return;
  for (const [eventId, mapped] of supplementalIndex) {
    if (!eventIdIndex.has(eventId)) eventIdIndex.set(eventId, mapped);
  }
}

/**
 * Φάση 2 bundle χώρου (σινεμά/θέατρο): scrape more.com + retry pending eventIds.
 * Ίδια ροή για κάθε venue με venue bundle όταν τα eventIds δεν υπάρχουν στο per-title index.
 */
async function runBundleVenueScrapeRetry({
  venue,
  pending,
  venueStats,
  scrapeCache,
  supplementalIndex,
  eventIdIndex,
  titlePool,
  indexMappingsFromScrape,
  report,
  onProgress,
  progressNoun,
  persistQueue,
  onEachUnmapped,
  onEachRetry,
}) {
  if (!pending.length) return;

  if (!BUNDLE_SYNC_SCRAPE_ENABLED || !titlePool?.length) {
    for (const item of pending) onEachUnmapped(item);
    return;
  }

  venueStats.scrapeDeferredCount = pending.length;
  const { url, result: scrape, tried, candidates } = await loadVenueScrapeWithFallback(
    venue,
    scrapeCache,
  );
  venueStats.scrapeLink = url;
  venueStats.scrapeTried = tried;

  if (!candidates.length) {
    venueStats.scrapeError = 'no_scrape_candidates';
    for (const item of pending) onEachUnmapped(item);
    return;
  }

  if (onProgress) {
    onProgress(
      `${progressNoun} «${venue.name}»: scrape για ${pending.length} μη συγχρονισμένες εγγραφές…`,
    );
  }

  if (!scrape?.ok) {
    venueStats.scrapeError = scrape?.error || 'scrape_failed';
    for (const item of pending) onEachUnmapped(item);
    return;
  }

  venueStats.scrapeEventCount = scrape.eventCount || 0;
  indexMappingsFromScrape(scrape, supplementalIndex, titlePool, report, persistQueue);
  mergeSupplementalIntoEventIdIndex(supplementalIndex, eventIdIndex);

  for (const item of pending) {
    await onEachRetry(item);
  }
}

function trimReportDetailArrays(report) {
  if (!report || typeof report !== 'object') return report;
  const cap = (arr, key) => {
    if (!Array.isArray(arr) || arr.length <= REPORT_DETAIL_MAX) return arr;
    report[`${key}Truncated`] = arr.length - REPORT_DETAIL_MAX;
    return arr.slice(0, REPORT_DETAIL_MAX);
  };
  report.byMovie = cap(report.byMovie, 'byMovie');
  report.byVenue = cap(report.byVenue, 'byVenue');
  report.byTheaterShow = cap(report.byTheaterShow, 'byTheaterShow');
  report.byTheaterVenue = cap(report.byTheaterVenue, 'byTheaterVenue');
  report.missingVenueIds = cap(report.missingVenueIds, 'missingVenueIds');
  report.errors = cap(report.errors, 'errors');
  return report;
}

function eventMatchesVenue(event, expectedVenueId) {
  const expected = String(expectedVenueId ?? '').trim();
  if (!expected) return true;
  const moreVenueId = String(event?.venueId ?? '').trim();
  return !moreVenueId || moreVenueId === expected;
}

function buildMovieCodeLookup(movieCodeEntries) {
  const map = new Map();
  for (const entry of movieCodeEntries || []) {
    for (const code of entry.codes || []) {
      const c = String(code || '').trim();
      if (!c || isVenueBundleCode(c) || map.has(c)) continue;
      map.set(c, { movieId: entry.id, movieTitle: entry.title });
    }
  }
  return map;
}

/**
 * Άγνωστο bundle eventId → πρόσθετοι κωδικοί χώρου + ήδη cached κωδικοί ταινιών (χωρίς νέα API).
 * Το κύριο ευρετήριο eventId χτίζεται από expandCinemaEventIdIndexFromMovieCodes.
 */
async function resolveEventIdViaMovieCodes({
  eventId,
  venue,
  movieCodeLookup,
  eventsCache,
  supplementalIndex,
  report,
  extraCodes = [],
}) {
  const key = String(eventId ?? '').trim();
  if (!key || !eventsCache) return null;

  const expectedVenue = venue?.venue_id;
  const codesToTry = [];
  const seen = new Set();
  const queue = (raw) => {
    const code = String(raw || '').trim();
    if (!code || isVenueBundleCode(code) || seen.has(code)) return;
    seen.add(code);
    codesToTry.push(code);
  };

  for (const code of extraCodes || []) queue(code);
  if (movieCodeLookup) {
    for (const code of movieCodeLookup.keys()) queue(code);
  }

  for (const code of codesToTry) {
    if (typeof eventsCache.has === 'function' && !eventsCache.has(code)) continue;

    const entry = movieCodeLookup?.get(code);
    if (!entry) continue;

    let events = [];
    try {
      events = await eventsCache.get(code);
    } catch {
      events = [];
    }
    const hit = events.find(
      (e) => String(e.eventId ?? '').trim() === key && eventMatchesVenue(e, expectedVenue),
    );
    if (!hit) continue;

    const mapped = {
      movieId: entry.movieId,
      movieTitle: entry.movieTitle,
      viaMovieCode: code,
    };
    supplementalIndex.set(key, mapped);
    if (report) {
      report.resolvedViaMovieCode = (report.resolvedViaMovieCode || 0) + 1;
    }
    return mapped;
  }

  return null;
}

async function resolveCinemaMovieFromEventId({
  eventId,
  eventIdIndex,
  supplementalIndex,
  scrapeCache,
  venue,
  moviesForTitle,
  movieCodeLookup,
  eventsCache,
  report,
  allowBundleScrape = false,
  persistQueue,
}) {
  const key = String(eventId ?? '').trim();
  const primary = eventIdIndex.get(key);
  if (primary) return primary;

  const cached = supplementalIndex.get(key);
  if (cached) return cached;

  const venueMovieCodes = collectVenueSupplementalMovieCodes(
    venue,
    venue?.bundleCodes || collectVenueBundleCodes(venue),
  );
  const viaCode = await resolveEventIdViaMovieCodes({
    eventId: key,
    venue,
    movieCodeLookup,
    eventsCache,
    supplementalIndex,
    report,
    extraCodes: venueMovieCodes,
  });
  if (viaCode) return viaCode;

  const scrapeAllowed =
    (allowBundleScrape && BUNDLE_SYNC_SCRAPE_ENABLED) ||
    (SCRAPE_ENABLED && SCRAPE_ON_SYNC);
  if (!scrapeAllowed || !moviesForTitle?.length) return null;

  const { url: link, result: scrape } = await loadVenueScrapeWithFallback(venue, scrapeCache);
  const row = lookupScrapedEventRow(scrape?.byEventId, key);
  if (!row?.playTitle) {
    if (scrape && !scrape.ok && report) {
      report.scrapeFailures = (report.scrapeFailures || 0) + 1;
      if (!report.scrapeErrors) report.scrapeErrors = [];
      if (report.scrapeErrors.length < 12) {
        report.scrapeErrors.push({
          venueId: venue?.id,
          venueName: venue?.name,
          link,
          error: scrape.error || 'scrape_failed',
        });
      }
    }
    return null;
  }

  const match = findBestCmsMatchByPlayTitle(row.playTitle, moviesForTitle);
  if (!match) {
    if (report) {
      report.scrapeTitleUnmatched = (report.scrapeTitleUnmatched || 0) + 1;
      if (!report.scrapeTitleMisses) report.scrapeTitleMisses = [];
      if (report.scrapeTitleMisses.length < 20) {
        report.scrapeTitleMisses.push({
          venueId: venue?.id,
          eventId: key,
          playTitle: row.playTitle,
        });
      }
    }
    return null;
  }

  const mapped = {
    movieId: match.cmsId,
    movieTitle: match.cmsTitle,
    viaScrape: true,
    playTitle: row.playTitle,
    matchScore: match.score,
  };
  supplementalIndex.set(key, mapped);
  queueScrapeMappingForPersist(persistQueue, 'movie', match.cmsId, key, mapped, null);
  report.resolvedViaVenueScrape = (report.resolvedViaVenueScrape || 0) + 1;
  return mapped;
}

function indexCinemaMappingsFromVenueScrape(
  scrape,
  supplementalIndex,
  moviesForTitle,
  report,
  persistQueue,
) {
  if (!scrape?.ok || !scrape.byEventId?.size || !moviesForTitle?.length) return 0;

  const pool = moviesForTitle;
  let added = 0;

  for (const [eventId, row] of scrape.byEventId) {
    const key = String(eventId ?? '').trim();
    if (!key || supplementalIndex.has(key) || !row?.playTitle) continue;

    const match = findBestCmsMatchByPlayTitle(row.playTitle, pool);
    if (!match) {
      if (report) {
        report.scrapeTitleUnmatched = (report.scrapeTitleUnmatched || 0) + 1;
        if (!report.scrapeTitleMisses) report.scrapeTitleMisses = [];
        if (report.scrapeTitleMisses.length < 20) {
          report.scrapeTitleMisses.push({ eventId: key, playTitle: row.playTitle });
        }
      }
      continue;
    }

    const mapped = {
      movieId: match.cmsId,
      movieTitle: match.cmsTitle,
      viaScrape: true,
      playTitle: row.playTitle,
      matchScore: match.score,
    };
    supplementalIndex.set(key, mapped);
    queueScrapeMappingForPersist(persistQueue, 'movie', match.cmsId, key, mapped, null);
    added += 1;
  }

  if (added > 0 && report) {
    report.resolvedViaVenueScrape = (report.resolvedViaVenueScrape || 0) + added;
  }
  return added;
}

function indexTheaterMappingsFromVenueScrape(
  scrape,
  supplementalIndex,
  showsForTitle,
  report,
  persistQueue,
) {
  if (!scrape?.ok || !scrape.byEventId?.size || !showsForTitle?.length) return 0;

  const pool = showsForTitle;
  let added = 0;

  for (const [eventId, row] of scrape.byEventId) {
    const key = String(eventId ?? '').trim();
    if (!key || supplementalIndex.has(key) || !row?.playTitle) continue;

    const match = findBestCmsMatchByPlayTitle(row.playTitle, pool);
    if (!match) continue;

    const mapped = {
      theaterShowId: match.cmsId,
      showTitle: match.cmsTitle,
      viaScrape: true,
      playTitle: row.playTitle,
      matchScore: match.score,
    };
    supplementalIndex.set(key, mapped);
    queueScrapeMappingForPersist(persistQueue, 'theater_show', match.cmsId, key, mapped, null);
    added += 1;
  }

  if (added > 0 && report) {
    report.resolvedViaVenueScrape = (report.resolvedViaVenueScrape || 0) + added;
  }
  return added;
}

function recordCinemaBundleUnmapped(report, venueStats, venueSyncTracker, venueId, inWeek) {
  report.skippedUnknownEventId += 1;
  venueStats.skippedUnknownEventId += 1;
  venueStats.skipped += 1;
  venueSyncTracker.record(venueId, { skippedUnknownEventId: 1 });
  if (inWeek) venueSyncTracker.recordWeekEvent(venueId, 'failed');
}

async function processOneCinemaBundleEvent(
  strapi,
  {
    event,
    code,
    venue,
    allowBundleScrape,
    resolveCtx,
    showtimeExistenceIndex,
    now,
    venueStats,
    report,
    venueSyncTracker,
  },
) {
  const eventId = String(event.eventId ?? '').trim();
  const inWeek = moreEventInTargetCinemaWeekForVenueStatus(event, now);

  const mapped = await resolveCinemaMovieFromEventId({
    ...resolveCtx,
    eventId,
    allowBundleScrape,
  });
  if (!mapped) {
    return { kind: 'unmapped', inWeek };
  }

  if (mapped.viaScrape) {
    queueScrapeMappingForPersist(
      resolveCtx.persistQueue,
      'movie',
      mapped.movieId,
      eventId,
      mapped,
      event,
    );
  }

  if (venue.venue_id) {
    const moreVenueId = String(event.venueId ?? '').trim();
    const expected = String(venue.venue_id).trim();
    if (expected && moreVenueId && moreVenueId !== expected) {
      venueStats.skipped += 1;
      venueStats.skippedVenueMismatch += 1;
      venueSyncTracker.record(venue.id, { skippedVenueMismatch: 1 });
      if (inWeek) venueSyncTracker.recordWeekEvent(venue.id, 'failed');
      return { kind: 'skipped' };
    }
  }

  const result = await upsertShowtimeFromEvent(strapi, report, {
    event,
    movieId: mapped.movieId,
    venue,
    now,
    statsTarget: venueStats,
    eventGroupCode: code,
    syncPath: 'venue_bundle',
    contentResolution: mapped,
    showtimeExistenceIndex,
  });
  venueSyncTracker.recordUpsertResult(venue.id, result);
  if (inWeek) {
    venueSyncTracker.recordWeekEvent(venue.id, weekSyncOutcomeFromUpsert(result));
  }
  if (result === 'created') report.createdFromVenues += 1;
  return { kind: 'done', result };
}

/**
 * Bundle σινεμά: πρώτα index + cached κωδικοί· scrape μόνο αν μείνουν μελλοντικές προβολές χωρίς ταύτιση.
 */
async function syncCinemaVenueBundleEvents(
  strapi,
  {
    venue,
    venueStats,
    eventsCache,
    eventIdIndex,
    supplementalIndex,
    scrapeCache,
    moviesForTitle,
    movieCodeLookup,
    report,
    venueSyncTracker,
    showtimeExistenceIndex,
    now,
    onProgress,
    persistQueue,
  },
) {
  const resolveCtx = {
    eventIdIndex,
    supplementalIndex,
    scrapeCache,
    venue,
    moviesForTitle,
    movieCodeLookup,
    eventsCache,
    report,
    persistQueue,
  };

  const pending = [];

  for (const code of venue.bundleCodes) {
    let events = [];
    try {
      events = await eventsCache.get(code);
    } catch (e) {
      throw Object.assign(e, { code });
    }
    for (const event of events) {
      const outcome = await processOneCinemaBundleEvent(strapi, {
        event,
        code,
        venue,
        allowBundleScrape: false,
        resolveCtx,
        showtimeExistenceIndex,
        now,
        venueStats,
        report,
        venueSyncTracker,
      });
      if (outcome.kind !== 'unmapped') continue;

      const datetime = parseMoreEventDatetime(event.eventDate);
      if (!datetime || datetime < now) {
        recordCinemaBundleUnmapped(report, venueStats, venueSyncTracker, venue.id, outcome.inWeek);
        continue;
      }
      pending.push({ event, code, inWeek: outcome.inWeek });
    }
  }

  if (!pending.length) return;

  await runBundleVenueScrapeRetry({
    venue,
    pending,
    venueStats,
    scrapeCache,
    supplementalIndex,
    eventIdIndex,
    titlePool: moviesForTitle,
    indexMappingsFromScrape: indexCinemaMappingsFromVenueScrape,
    report,
    onProgress,
    progressNoun: 'Σινεμά',
    persistQueue,
    onEachUnmapped: ({ inWeek }) =>
      recordCinemaBundleUnmapped(report, venueStats, venueSyncTracker, venue.id, inWeek),
    onEachRetry: async ({ event, code, inWeek }) => {
      const outcome = await processOneCinemaBundleEvent(strapi, {
        event,
        code,
        venue,
        allowBundleScrape: false,
        resolveCtx,
        showtimeExistenceIndex,
        now,
        venueStats,
        report,
        venueSyncTracker,
      });
      if (outcome.kind === 'unmapped') {
        recordCinemaBundleUnmapped(report, venueStats, venueSyncTracker, venue.id, inWeek);
      }
    },
  });
}

function recordTheaterBundleUnmapped(report, venueStats, eventId) {
  report.skippedUnknownEventId += 1;
  venueStats.skippedUnknownEventId += 1;
  venueStats.skipped += 1;
}

async function processOneTheaterBundleEvent(
  strapi,
  {
    event,
    code,
    venue,
    allowBundleScrape,
    resolveCtx,
    performanceExistenceIndex,
    now,
    venueStats,
    report,
  },
) {
  const eventId = String(event.eventId ?? '').trim();
  const mapped = await resolveTheaterShowFromEventId({
    ...resolveCtx,
    eventId,
    allowBundleScrape,
  });
  if (!mapped) return { kind: 'unmapped' };

  if (mapped.viaScrape) {
    queueScrapeMappingForPersist(
      resolveCtx.persistQueue,
      'theater_show',
      mapped.theaterShowId,
      eventId,
      mapped,
      event,
    );
  }

  if (venue.venue_id) {
    const moreVenueId = String(event.venueId ?? '').trim();
    const expected = String(venue.venue_id).trim();
    if (expected && moreVenueId && moreVenueId !== expected) {
      venueStats.skipped += 1;
      return { kind: 'skipped' };
    }
  }

  const result = await upsertPerformanceFromEvent(strapi, report, {
    event,
    theaterShowId: mapped.theaterShowId,
    venue,
    now,
    statsTarget: venueStats,
    eventGroupCode: code,
    syncPath: 'theater_venue_bundle',
    contentResolution: mapped,
    performanceExistenceIndex,
  });
  if (result === 'created') report.createdFromTheaterVenues += 1;
  return { kind: 'done', result };
}

async function syncTheaterVenueBundleEvents(
  strapi,
  {
    venue,
    venueStats,
    eventsCache,
    eventIdIndex,
    supplementalIndex,
    scrapeCache,
    showsForTitle,
    report,
    performanceExistenceIndex,
    now,
    onProgress,
    persistQueue,
  },
) {
  const resolveCtx = {
    eventIdIndex,
    supplementalIndex,
    scrapeCache,
    venue,
    showsForTitle,
    report,
    persistQueue,
  };

  const pending = [];

  for (const code of venue.bundleCodes) {
    let events = [];
    try {
      events = await eventsCache.get(code);
    } catch (e) {
      throw Object.assign(e, { code });
    }
    for (const event of events) {
      const outcome = await processOneTheaterBundleEvent(strapi, {
        event,
        code,
        venue,
        allowBundleScrape: false,
        resolveCtx,
        performanceExistenceIndex,
        now,
        venueStats,
        report,
      });
      if (outcome.kind !== 'unmapped') continue;

      const datetime = parseMoreEventDatetime(event.eventDate);
      if (!datetime || datetime < now) {
        recordTheaterBundleUnmapped(report, venueStats);
        continue;
      }
      pending.push({ event, code });
    }
  }

  if (!pending.length) return;

  await runBundleVenueScrapeRetry({
    venue,
    pending,
    venueStats,
    scrapeCache,
    supplementalIndex,
    eventIdIndex,
    titlePool: showsForTitle,
    indexMappingsFromScrape: indexTheaterMappingsFromVenueScrape,
    report,
    onProgress,
    progressNoun: 'Χώρος',
    persistQueue,
    onEachUnmapped: () => recordTheaterBundleUnmapped(report, venueStats),
    onEachRetry: async ({ event, code }) => {
      const outcome = await processOneTheaterBundleEvent(strapi, {
        event,
        code,
        venue,
        allowBundleScrape: false,
        resolveCtx,
        performanceExistenceIndex,
        now,
        venueStats,
        report,
      });
      if (outcome.kind === 'unmapped') {
        recordTheaterBundleUnmapped(report, venueStats);
      }
    },
  });
}

async function resolveTheaterShowFromEventId({
  eventId,
  eventIdIndex,
  supplementalIndex,
  scrapeCache,
  venue,
  showsForTitle,
  report,
  allowBundleScrape = false,
  persistQueue,
}) {
  const key = String(eventId ?? '').trim();
  const primary = eventIdIndex.get(key);
  if (primary) return primary;

  const cached = supplementalIndex.get(key);
  if (cached) return cached;

  const scrapeAllowed =
    (allowBundleScrape && BUNDLE_SYNC_SCRAPE_ENABLED) ||
    (SCRAPE_ENABLED && SCRAPE_ON_SYNC);
  if (!scrapeAllowed || !showsForTitle?.length) return null;

  const { url: link, result: scrape } = await loadVenueScrapeWithFallback(venue, scrapeCache);
  const row = lookupScrapedEventRow(scrape?.byEventId, key);
  if (!row?.playTitle) return null;

  const match = findBestCmsMatchByPlayTitle(row.playTitle, showsForTitle);
  if (!match) return null;

  const mapped = {
    theaterShowId: match.cmsId,
    showTitle: match.cmsTitle,
    viaScrape: true,
    playTitle: row.playTitle,
    matchScore: match.score,
  };
  supplementalIndex.set(key, mapped);
  queueScrapeMappingForPersist(persistQueue, 'theater_show', match.cmsId, key, mapped, null);
  report.resolvedViaVenueScrape = (report.resolvedViaVenueScrape || 0) + 1;
  return mapped;
}

/**
 * Συμπληρώνει weekExpected/weekSynced για σινεμά όπου το sync δεν μέτρησε εβδομάδα
 * (π.χ. λάθος bounds, skip bundle λόγω complete, χαμένα stats από batches ταινιών).
 */
async function fillCinemaVenueWeekStatsFromBundles(strapi, {
  venuesWithBundle,
  tracker,
  eventsCache,
  eventIdIndex,
  showtimeExistenceIndex,
  now,
}) {
  if (!venuesWithBundle?.length || !tracker || !eventsCache) return { filled: 0 };

  const statsByVenueId = new Map(tracker.entries());
  let filled = 0;

  for (const venue of venuesWithBundle) {
    if (venue.updated === VENUE_UPDATED_STATUS.COMPLETE) continue;
    if (!venue.bundleCodes?.length) continue;

    const existing = statsByVenueId.get(venue.id);
    if (existing && (existing.weekExpected || 0) > 0) continue;

    tracker.touch(venue.id);
    let hadWeekEvents = false;

    for (const code of venue.bundleCodes) {
      let events = [];
      try {
        events = await eventsCache.get(code);
      } catch {
        events = [];
      }

      for (const event of events) {
        const inWeek = moreEventInTargetCinemaWeekForVenueStatus(event, now);
        if (!inWeek) continue;

        hadWeekEvents = true;
        const eventId = String(event.eventId ?? '').trim();
        const mapped = eventIdIndex.get(eventId);
        if (!mapped) {
          tracker.recordWeekEvent(venue.id, 'failed');
          tracker.record(venue.id, { skippedUnknownEventId: 1 });
          continue;
        }

        if (venue.venue_id) {
          const moreVenueId = String(event.venueId ?? '').trim();
          const expected = String(venue.venue_id).trim();
          if (expected && moreVenueId && moreVenueId !== expected) {
            tracker.recordWeekEvent(venue.id, 'failed');
            tracker.record(venue.id, { skippedVenueMismatch: 1 });
            continue;
          }
        }

        const datetime = parseMoreEventDatetime(event.eventDate);
        if (!datetime || datetime < now) continue;

        const exists = await showtimeExistsAt(
          strapi,
          { movieId: mapped.movieId, venueId: venue.id, datetime },
          showtimeExistenceIndex,
        );
        tracker.recordWeekEvent(venue.id, exists ? 'synced' : 'failed');
      }
    }

    if (hadWeekEvents) filled += 1;
  }

  return { filled };
}

async function syncMovieShowtimesFromMore(strapi, {
  movies,
  venueLookup,
  venuesWithBundle,
  eventsCache,
  now,
  venuePresenceIndex,
  onProgress,
  skipMovieLoop = false,
  skipVenueBundles = false,
  sharedVenueSyncTracker = null,
  deferVenueUpdatedApply = false,
  eventIdIndex: sharedEventIdIndex,
  progressOffset = 0,
  totalMoviesCount = null,
  totalVenuesCount = null,
  showtimeExistenceIndex = null,
  movieCodeEntries = [],
  eventIdPersistQueue = null,
}) {
  const report = {
    ...emptySyncCounters(),
    moviesScanned: movies.length,
    venuesWithMoreId: venueLookup.byMoreId.size,
    venuesWithBundleCode: venuesWithBundle.filter((v) => v.bundleCodes?.length).length,
    createdFromMovies: 0,
    createdFromVenues: 0,
    createdCinemaVenues: 0,
    createdCinemaVenuesList: [],
    byMovie: [],
    byVenue: [],
    missingVenueIds: [],
  };

  const pendingVenueCreates = new Map();
  const failedVenueKeys = new Set();
  const errorDedup = new Set();
  const venueSyncTracker = sharedVenueSyncTracker || createVenueSyncStatsTracker();
  const scrapeCache = createVenueScrapeCache({ forBundleSync: true });
  const supplementalEventIndex = new Map();
  const movieCodeLookup = movieCodeEntries.length ? buildMovieCodeLookup(movieCodeEntries) : null;
  const needsTitleMatchPool =
    venuesWithBundle.length > 0 &&
    (BUNDLE_SYNC_SCRAPE_ENABLED || (SCRAPE_ENABLED && SCRAPE_ON_SYNC));
  const moviesForTitle = needsTitleMatchPool
    ? await loadCmsEntriesForPlayTitleMatch(strapi, 'api::movie.movie', [
        'id',
        'title',
        'slug',
        'original_title',
      ], 'movie')
    : [];

  if (!movies.length && !venuesWithBundle.length) {
    report.note = 'Δεν υπάρχουν ταινίες με per-movie event_group_code ούτε σινεμά με venue bundle.';
    return report;
  }

  if (!movies.length && venuesWithBundle.length) {
    report.note =
      'Δεν υπάρχουν ταινίες με per-movie event_group_code — συγχρονισμός μόνο από venue bundle σινεμά.';
  }

  const eventIdIndex = sharedEventIdIndex || new Map();

  if (!skipMovieLoop) {
    const processedMovieIds = new Set();
    for (let movieIndex = 0; movieIndex < movies.length; movieIndex += 1) {
      const movie = movies[movieIndex];
      if (processedMovieIds.has(movie.id)) continue;
      processedMovieIds.add(movie.id);
      const label = movie.title || movie.slug || `#${movie.id}`;
      const movieNum =
        movie._syncOrdinal != null ? movie._syncOrdinal : progressOffset + movieIndex + 1;
      const totalHint =
        totalMoviesCount != null ? `${movieNum}/${totalMoviesCount}` : String(movieNum);
      const codes = collectEventGroupCodes(movie);
      const movieStats = {
        movieId: movie.id,
        title: movie.title,
        eventGroupCodes: codes,
        eventGroupCode: codes[0] || null,
        created: 0,
        alreadyExists: 0,
        skipped: 0,
        missingVenueIds: new Set(),
      };

      for (let codeIdx = 0; codeIdx < codes.length; codeIdx += 1) {
        const code = codes[codeIdx];
        try {
          if (onProgress) {
            if (codes.length === 1) {
              onProgress(`Ταινία ${totalHint}: «${label}» · More API (${code})…`);
            } else if (codeIdx === 0) {
              onProgress(
                `Ταινία ${totalHint}: «${label}» · More API (${codes.length} κωδικοί)…`,
              );
            } else {
              onProgress(
                `Ταινία ${totalHint}: «${label}» · κωδικός ${codeIdx + 1}/${codes.length} (${code})…`,
              );
            }
          }
          const events = await eventsCache.get(code);

          for (const event of events) {
            const eventId = String(event.eventId ?? '').trim();
            if (eventId && !eventIdIndex.has(eventId)) {
              eventIdIndex.set(eventId, { movieId: movie.id });
            }

            let venue = resolveVenueFromMoreEvent(venueLookup, event);
            if (!venue) {
              venue = await ensureCinemaVenueFromMoreEvent(
                strapi,
                venueLookup,
                event,
                report,
                pendingVenueCreates,
                failedVenueKeys,
                errorDedup,
              );
            }
            if (!venue) {
              report.skippedNoVenue += 1;
              movieStats.skipped += 1;
              const missingId = normalizeMoreVenueId(event?.venueId);
              if (missingId && isVenueMissingFromPresenceIndex(event, venuePresenceIndex)) {
                movieStats.missingVenueIds.add(missingId);
              }
              continue;
            }

            registerVenueInPresenceIndex(venuePresenceIndex, venue);
            venueSyncTracker.touch(venue.id);
            const inWeek = moreEventInTargetCinemaWeekForVenueStatus(event, now);
            const result = await upsertShowtimeFromEvent(strapi, report, {
              event,
              movieId: movie.id,
              venue,
              now,
              statsTarget: movieStats,
              eventGroupCode: code,
              syncPath: 'movie_event_group',
              contentResolution: { movieId: movie.id, movieTitle: movie.title },
              showtimeExistenceIndex,
            });
            venueSyncTracker.recordUpsertResult(venue.id, result);
            if (inWeek) {
              venueSyncTracker.recordWeekEvent(venue.id, weekSyncOutcomeFromUpsert(result));
            }
            if (result === 'created') report.createdFromMovies += 1;
          }
        } catch (e) {
          const msg = e?.message || String(e);
          pushSyncError(report, errorDedup, {
            movieId: movie.id,
            title: movie.title,
            code,
            error: msg,
          });
          strapi.log.warn(`[more-showtime-sync] movie ${movie.id} (${code}): ${msg}`);
        }
      }

      if (movieStats.created > 0 || movieStats.missingVenueIds.size > 0) {
        report.byMovie.push({
          movieId: movieStats.movieId,
          title: movieStats.title,
          eventGroupCodes: movieStats.eventGroupCodes,
          eventGroupCode: movieStats.eventGroupCode,
          created: movieStats.created,
          alreadyExists: movieStats.alreadyExists,
          skipped: movieStats.skipped,
          missingVenueIds: [...movieStats.missingVenueIds],
        });
        for (const vid of movieStats.missingVenueIds) {
          report.missingVenueIds.push({
            movieId: movie.id,
            title: movie.title,
            moreVenueId: vid,
          });
        }
      }
    }
  }

  if (!skipVenueBundles) for (let venueIdx = 0; venueIdx < venuesWithBundle.length; venueIdx += 1) {
    const venue = venuesWithBundle[venueIdx];
    const venueNum = venueIdx + 1;
    const venueTotalHint =
      totalVenuesCount != null ? `${venueNum}/${totalVenuesCount}` : String(venueNum);
    if (!venue.bundleCodes?.length) {
      if (onProgress) {
        onProgress(`Σινεμά ${venueTotalHint}: «${venue.name}» — χωρίς bundle codes, παράλειψη`);
      }
      continue;
    }
    if (onProgress) {
      const wasComplete = venue.updated === VENUE_UPDATED_STATUS.COMPLETE;
      onProgress(
        wasComplete
          ? `Σινεμά ${venueTotalHint}: «${venue.name}» · bundle (${venue.bundleCodes.length} κωδ.) — επανέλεγχος (ήταν complete)…`
          : `Σινεμά ${venueTotalHint}: «${venue.name}» · bundle (${venue.bundleCodes.length} κωδ.)…`,
      );
    }
    const venueStats = {
      venueId: venue.id,
      name: venue.name,
      bundleCodes: venue.bundleCodes,
      created: 0,
      alreadyExists: 0,
      skipped: 0,
      skippedUnknownEventId: 0,
      skippedVenueMismatch: 0,
    };

    venueSyncTracker.touch(venue.id);

    try {
      await syncCinemaVenueBundleEvents(strapi, {
        venue,
        venueStats,
        eventsCache,
        eventIdIndex,
        supplementalIndex: supplementalEventIndex,
        scrapeCache,
        moviesForTitle,
        movieCodeLookup,
        report,
        venueSyncTracker,
        showtimeExistenceIndex,
        now,
        onProgress,
        persistQueue: eventIdPersistQueue,
      });
    } catch (e) {
      const msg = e?.message || String(e);
      venueStats.errors = (venueStats.errors || 0) + 1;
      venueSyncTracker.record(venue.id, { errors: 1 });
      pushSyncError(report, errorDedup, {
        venueId: venue.id,
        name: venue.name,
        code: e.code || venue.bundleCodes?.[0],
        error: msg,
      });
      strapi.log.warn(`[more-showtime-sync] venue ${venue.id}: ${msg}`);
    }

    if (
      venueStats.created > 0 ||
      venueStats.alreadyExists > 0 ||
      venueStats.skippedUnknownEventId > 0
    ) {
      report.byVenue.push(venueStats);
    }
  }

  if (!deferVenueUpdatedApply && !skipVenueBundles && venueSyncTracker.entries().length > 0) {
    await migrateVenueUpdatedBooleanToEnum(strapi);
    report.venueUpdatedStatuses = await applyCinemaVenueUpdatedStatuses(strapi, venueSyncTracker, {
      autoCreatedVenueIds: (report.createdCinemaVenuesList || []).map((v) => v.id),
      now,
    });
  }

  report.eventIdIndex = eventIdIndex;
  return trimReportDetailArrays(report);
}

async function syncTheaterPerformancesFromMore(strapi, {
  theaterShows,
  venueLookup,
  venuesWithBundle,
  eventsCache,
  now,
  venuePresenceIndex,
  onProgress,
  skipShowLoop = false,
  skipVenueBundles = false,
  eventIdIndex: sharedEventIdIndex,
  progressOffset = 0,
  totalShowsCount = null,
  totalVenuesCount = null,
  performanceExistenceIndex = null,
  eventIdPersistQueue = null,
}) {
  const report = {
    ...emptySyncCounters(),
    theaterShowsScanned: theaterShows.length,
    theaterVenuesWithMoreId: venueLookup.byMoreId.size,
    theaterVenuesWithBundleCode: venuesWithBundle.filter((v) => v.bundleCodes?.length).length,
    createdFromTheaterShows: 0,
    createdFromTheaterVenues: 0,
    createdTheaterVenues: 0,
    createdTheaterVenuesList: [],
    byTheaterShow: [],
    byTheaterVenue: [],
    missingVenueIds: [],
  };

  if (!theaterShows.length && !venuesWithBundle.length) {
    report.note = 'Δεν υπάρχουν παραστάσεις θεάτρου με event_group_code.';
    return report;
  }

  const pendingVenueCreates = new Map();
  const failedVenueKeys = new Set();
  const errorDedup = new Set();
  const scrapeCache = createVenueScrapeCache({ forBundleSync: true });
  const supplementalEventIndex = new Map();
  const needsTheaterTitlePool =
    venuesWithBundle.length > 0 &&
    (BUNDLE_SYNC_SCRAPE_ENABLED || (SCRAPE_ENABLED && SCRAPE_ON_SYNC));
  const showsForTitle = needsTheaterTitlePool
    ? await loadCmsEntriesForPlayTitleMatch(strapi, 'api::theater-show.theater-show', [
        'id',
        'title',
        'slug',
      ], 'theater_show')
    : [];

  const eventIdIndex = sharedEventIdIndex || new Map();

  if (!skipShowLoop) {
    const processedShowIds = new Set();
    for (let showIndex = 0; showIndex < theaterShows.length; showIndex += 1) {
      const show = theaterShows[showIndex];
      if (processedShowIds.has(show.id)) continue;
      processedShowIds.add(show.id);
      const label = show.title || show.slug || `#${show.id}`;
      const showNum =
        show._syncOrdinal != null ? show._syncOrdinal : progressOffset + showIndex + 1;
      const totalHint =
        totalShowsCount != null ? `${showNum}/${totalShowsCount}` : String(showNum);
      const codes = collectEventGroupCodes(show);
      const showStats = {
        theaterShowId: show.id,
        title: show.title,
        eventGroupCodes: codes,
        eventGroupCode: codes[0] || null,
        created: 0,
        alreadyExists: 0,
        skipped: 0,
        missingVenueIds: new Set(),
      };

      for (let codeIdx = 0; codeIdx < codes.length; codeIdx += 1) {
        const code = codes[codeIdx];
        try {
          if (onProgress) {
            if (codes.length === 1) {
              onProgress(`Παράσταση ${totalHint}: «${label}» · More API (${code})…`);
            } else if (codeIdx === 0) {
              onProgress(
                `Παράσταση ${totalHint}: «${label}» · More API (${codes.length} κωδικοί)…`,
              );
            } else {
              onProgress(
                `Παράσταση ${totalHint}: «${label}» · κωδικός ${codeIdx + 1}/${codes.length} (${code})…`,
              );
            }
          }
          const events = await eventsCache.get(code);

          for (const event of events) {
            const eventId = String(event.eventId ?? '').trim();
            if (eventId && !eventIdIndex.has(eventId)) {
              eventIdIndex.set(eventId, {
                theaterShowId: show.id,
                theaterShowTitle: show.title,
              });
            }

            let venue = resolveVenueFromMoreEvent(venueLookup, event);
            if (!venue) {
              venue = await ensureTheaterVenueFromMoreEvent(
                strapi,
                venueLookup,
                event,
                report,
                pendingVenueCreates,
                failedVenueKeys,
                errorDedup,
              );
            }
            if (!venue) {
              report.skippedNoVenue += 1;
              showStats.skipped += 1;
              const missingId = normalizeMoreVenueId(event?.venueId);
              if (missingId && isVenueMissingFromPresenceIndex(event, venuePresenceIndex)) {
                showStats.missingVenueIds.add(missingId);
              }
              continue;
            }

            registerVenueInPresenceIndex(venuePresenceIndex, venue);
            const result = await upsertPerformanceFromEvent(strapi, report, {
              event,
              theaterShowId: show.id,
              venue,
              now,
              statsTarget: showStats,
              eventGroupCode: code,
              syncPath: 'theater_show_event_group',
              contentResolution: { theaterShowId: show.id, theaterShowTitle: show.title },
              performanceExistenceIndex,
            });
            if (result === 'created') report.createdFromTheaterShows += 1;
          }
        } catch (e) {
          const msg = e?.message || String(e);
          pushSyncError(report, errorDedup, {
            theaterShowId: show.id,
            title: show.title,
            code,
            error: msg,
          });
          strapi.log.warn(`[more-theater-sync] show ${show.id} (${code}): ${msg}`);
        }
      }

      if (showStats.created > 0 || showStats.alreadyExists > 0 || showStats.skipped > 0) {
        report.byTheaterShow.push({
          theaterShowId: showStats.theaterShowId,
          title: showStats.title,
          eventGroupCodes: showStats.eventGroupCodes,
          eventGroupCode: showStats.eventGroupCode,
          created: showStats.created,
          alreadyExists: showStats.alreadyExists,
          skipped: showStats.skipped,
          missingVenueIds: [...showStats.missingVenueIds],
        });
        for (const vid of showStats.missingVenueIds) {
          report.missingVenueIds.push({
            theaterShowId: show.id,
            title: show.title,
            moreVenueId: vid,
          });
        }
      }
    }
  }

  if (!skipVenueBundles) for (let venueIdx = 0; venueIdx < venuesWithBundle.length; venueIdx += 1) {
    const venue = venuesWithBundle[venueIdx];
    const venueNum = venueIdx + 1;
    const venueTotalHint =
      totalVenuesCount != null ? `${venueNum}/${totalVenuesCount}` : String(venueNum);
    if (!venue.bundleCodes?.length) {
      if (onProgress) {
        onProgress(`Χώρος ${venueTotalHint}: «${venue.name}» — χωρίς bundle codes, παράλειψη`);
      }
      continue;
    }
    if (onProgress) {
      onProgress(
        `Χώρος ${venueTotalHint}: «${venue.name}» · bundle (${venue.bundleCodes.length} κωδ.)…`,
      );
    }
    const venueStats = {
      venueId: venue.id,
      name: venue.name,
      bundleCodes: venue.bundleCodes,
      created: 0,
      alreadyExists: 0,
      skipped: 0,
      skippedUnknownEventId: 0,
    };

    try {
      await syncTheaterVenueBundleEvents(strapi, {
        venue,
        venueStats,
        eventsCache,
        eventIdIndex,
        supplementalIndex: supplementalEventIndex,
        scrapeCache,
        showsForTitle,
        report,
        performanceExistenceIndex,
        now,
        onProgress,
        persistQueue: eventIdPersistQueue,
      });
    } catch (e) {
      const msg = e?.message || String(e);
      pushSyncError(report, errorDedup, {
        venueId: venue.id,
        name: venue.name,
        code: e.code || venue.bundleCodes?.[0],
        error: msg,
      });
      strapi.log.warn(`[more-theater-sync] venue ${venue.id}: ${msg}`);
    }

    if (
      venueStats.created > 0 ||
      venueStats.alreadyExists > 0 ||
      venueStats.skippedUnknownEventId > 0
    ) {
      report.byTheaterVenue.push(venueStats);
    }
  }

  report.eventIdIndex = eventIdIndex;
  return trimReportDetailArrays(report);
}

/**
 * Συγχρονισμός More → CMS:
 * - ταινίες → Προβολή ταινίας (venue_id ή σινεματικό venue bundle)
 * - παραστάσεις θεάτρου → Θεατρική παράσταση (venue_id ή θεατρικό venue bundle)
 *
 * @param {object} strapi
 * @param {{ movieId?: number, theaterShowId?: number }} options
 */
function collectAllSyncEventGroupCodes(movies, theaterShows, cinemaVenuesWithBundle, theaterVenuesWithBundle) {
  const codes = [];
  for (const movie of movies) codes.push(...collectEventGroupCodes(movie));
  for (const show of theaterShows) codes.push(...collectEventGroupCodes(show));
  for (const venue of cinemaVenuesWithBundle) codes.push(...venue.bundleCodes);
  for (const venue of theaterVenuesWithBundle) codes.push(...venue.bundleCodes);
  return codes;
}

async function syncShowtimesFromMore(strapi, options = {}) {
  const started = Date.now();
  const now = new Date();
  const progress = (msg) => {
    if (typeof options.onProgress === 'function') options.onProgress(msg);
  };

  /** scope: 'cinema' | 'theater' | 'all' — επιτρέπει ξεχωριστά runs (λιγότερη μνήμη ανά process). */
  const scope =
    options.scope === 'cinema' || options.scope === 'theater' ? options.scope : 'all';
  const runCinema = scope !== 'theater';
  const runTheater = scope !== 'cinema';

  progress('Βήμα 1/3: ευρετήριο χώρων CMS (σειρά id — lookup μόνο)…');
  const allVenueRows = await loadAllVenuesForSync(strapi, progress);
  maybeGc();
  const globalVenueLookup = buildVenueLookup(
    allVenueRows.filter((v) => normalizeMoreVenueId(v.venue_id)),
  );
  const venuePresenceIndex = buildVenuePresenceIndexFromRows(allVenueRows);
  const cinemaVenueLookup = globalVenueLookup;
  const theaterVenueLookup = globalVenueLookup;
  let cinemaVenuesWithBundle = [];
  let cinemaVenueBundleCount = 0;
  let theaterVenuesWithBundle = [];
  let theaterVenueBundleCount = 0;

  const movieIdFilter =
    options.movieId != null && Number.isFinite(Number(options.movieId))
      ? Number(options.movieId)
      : undefined;
  const theaterShowIdFilter =
    options.theaterShowId != null && Number.isFinite(Number(options.theaterShowId))
      ? Number(options.theaterShowId)
      : undefined;

  let movieReport = null;
  let cinemaEventIdIndex = new Map();
  let moviesWithSecondaryCodes = 0;
  let movieCodeCount = 0;
  let totalMoviesScanned = 0;
  const eventIdPersistQueue = createEventIdPersistQueue();

  if (runCinema) {
    await loadPersistedCinemaEventIdsIntoIndex(strapi, cinemaEventIdIndex, progress);
  }

  if (runCinema) {
    progress(
      'Βήμα 2/3: ταινίες CMS (σειρά id) — νέα σινεμά + προβολές από More κωδικό ταινίας…',
    );
  }

  if (runCinema && movieIdFilter != null) {
    const movies = await loadMoviesWithCodesPage(strapi, {
      page: 1,
      pageSize: 1,
      movieIdFilter,
    });
    totalMoviesScanned = movies.length;
    for (const movie of movies) {
      const codes = collectEventGroupCodes(movie);
      movieCodeCount += codes.length;
      if (codes.length > 1) moviesWithSecondaryCodes += 1;
    }
    progress('Φόρτωση υπαρχουσών προβολών (ταινία)…');
    const showtimeExistenceIndex = await loadShowtimeExistenceIndex(
      strapi,
      movies.map((m) => m.id),
      now,
    );
    const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
    await prefetchEventCodes(eventsCache, collectCodesFromMovies(movies), progress);
    movieReport = await syncMovieShowtimesFromMore(strapi, {
      movies,
      venueLookup: cinemaVenueLookup,
      venuesWithBundle: cinemaVenuesWithBundle,
      eventsCache,
      now,
      venuePresenceIndex,
      onProgress: progress,
      totalMoviesCount: movies.length || 1,
      showtimeExistenceIndex,
      eventIdPersistQueue,
    });
    cinemaEventIdIndex = movieReport.eventIdIndex || cinemaEventIdIndex;
    eventsCache.clear();
    maybeGc();
  } else if (runCinema) {
    progress('Σάρωση CMS: ποιες ταινίες έχουν More κωδικό…');
    const moviesWithCodes = await listMoviesWithSyncCodes(strapi, progress);
    const totalWithCodes = moviesWithCodes.length;
    const cinemaEventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
    const cinemaVenueSyncTracker = createVenueSyncStatsTracker();
    let showtimeExistenceIndex = null;
    if (!totalWithCodes) {
      progress('Δεν βρέθηκαν ταινίες με More κωδικό στο CMS — skip ταινιών.');
    } else {
      progress(`Βρέθηκαν ${totalWithCodes} ταινίες με More κωδικό — φόρτωση υπαρχουσών προβολών…`);
      showtimeExistenceIndex = await loadShowtimeExistenceIndex(
        strapi,
        moviesWithCodes.map((entry) => entry.id),
        now,
      );
      progress(`Συγχρονισμός ταινιών 1/${totalWithCodes}…`);
      for (let offset = 0; offset < moviesWithCodes.length; offset += MOVIE_BATCH_SIZE) {
        const slice = moviesWithCodes.slice(offset, offset + MOVIE_BATCH_SIZE);
        for (const entry of slice) {
          movieCodeCount += entry.codes.length;
          if (entry.codes.length > 1) moviesWithSecondaryCodes += 1;
        }
        const movies = await loadMoviesForSyncBatch(strapi, slice);
        totalMoviesScanned += movies.length;
        await prefetchEventCodes(cinemaEventsCache, collectCodesFromMovies(movies), progress);
        const partial = await syncMovieShowtimesFromMore(strapi, {
          movies,
          venueLookup: cinemaVenueLookup,
          venuesWithBundle: [],
          eventsCache: cinemaEventsCache,
          now,
          venuePresenceIndex,
          onProgress: progress,
          skipVenueBundles: true,
          sharedVenueSyncTracker: cinemaVenueSyncTracker,
          deferVenueUpdatedApply: true,
          eventIdIndex: cinemaEventIdIndex,
          totalMoviesCount: totalWithCodes,
          showtimeExistenceIndex,
          eventIdPersistQueue,
        });
        cinemaEventIdIndex = partial.eventIdIndex || cinemaEventIdIndex;
        movieReport = mergeMovieSyncReports(movieReport, partial);
        maybeGc();
        await yieldEventLoop();
        progress(
          `Ταινίες: ${Math.min(offset + movies.length, totalWithCodes)}/${totalWithCodes} ολοκληρώθηκαν`,
        );
      }
    }

    progress(
      'Βήμα 3/3: σινεμά CMS (σειρά id) — προβολές από bundle codes + ταινίες βήμα 2…',
    );
    const allCinemaVenueRows = await loadVenueBundleRows(strapi, 'cinema', progress);
    cinemaVenuesWithBundle = venuesWithBundleFromRows(
      allCinemaVenueRows,
      collectVenueAllSyncCodes,
      { onlyWithBundles: false },
    );
    const cinemaVenuesWithBundleCodes = cinemaVenuesWithBundle.filter(
      (v) => v.bundleCodes.length > 0,
    );
    cinemaVenueBundleCount = cinemaVenuesWithBundleCodes.length;
    if (cinemaVenuesWithBundle.length) {
      progress(
        `Σινεμά CMS: ${cinemaVenuesWithBundle.length} συνολικά · ${cinemaVenuesWithBundleCodes.length} με bundle codes…`,
      );
      await prefetchEventCodes(
        cinemaEventsCache,
        collectCodesFromVenueBundles(cinemaVenuesWithBundle),
        progress,
      );
      if (moviesWithCodes.length) {
        const movieCodes = [];
        for (const entry of moviesWithCodes) {
          movieCodes.push(...(entry.codes || []));
        }
        await prefetchEventCodes(cinemaEventsCache, movieCodes, progress);
      }
      if (totalWithCodes > 0) {
        await expandCinemaEventIdIndexFromMovieCodes(
          cinemaEventIdIndex,
          moviesWithCodes,
          cinemaEventsCache,
          progress,
        );
      }
      const bundlePart = await syncMovieShowtimesFromMore(strapi, {
        movies: [],
        venueLookup: cinemaVenueLookup,
        venuesWithBundle: cinemaVenuesWithBundle,
        eventsCache: cinemaEventsCache,
        now,
        venuePresenceIndex,
        onProgress: progress,
        skipMovieLoop: true,
        sharedVenueSyncTracker: cinemaVenueSyncTracker,
        deferVenueUpdatedApply: true,
        eventIdIndex: cinemaEventIdIndex,
        movieCodeEntries: moviesWithCodes,
        totalVenuesCount: cinemaVenuesWithBundle.length,
        showtimeExistenceIndex,
        eventIdPersistQueue,
      });
      movieReport = mergeMovieSyncReports(movieReport, bundlePart);
    } else {
      progress('Δεν βρέθηκαν σινεμά στο CMS — skip bundles.');
    }

    if (cinemaVenueSyncTracker.entries().length > 0 || cinemaVenuesWithBundle.length > 0) {
      if (cinemaVenuesWithBundle.length > 0) {
        const fillReport = await fillCinemaVenueWeekStatsFromBundles(strapi, {
          venuesWithBundle: cinemaVenuesWithBundle,
          tracker: cinemaVenueSyncTracker,
          eventsCache: cinemaEventsCache,
          eventIdIndex: cinemaEventIdIndex,
          showtimeExistenceIndex,
          now,
        });
        if (fillReport.filled > 0) {
          progress(
            `venue.updated: συμπλήρωση στατιστικών εβδομάδας για ${fillReport.filled} σινεμά…`,
          );
        }
      }
      await migrateVenueUpdatedBooleanToEnum(strapi);
      movieReport.venueUpdatedStatuses = await applyCinemaVenueUpdatedStatuses(
        strapi,
        cinemaVenueSyncTracker,
        {
          autoCreatedVenueIds: (movieReport?.createdCinemaVenuesList || []).map((v) => v.id),
          now,
        },
      );
    }

    cinemaEventsCache.clear();
    maybeGc();
  }

  const theaterStepPrefix = runCinema && runTheater ? 'Θέατρο — ' : '';

  if (!movieReport) {
    movieReport = {
      ...emptySyncCounters(),
      moviesScanned: 0,
      venuesWithMoreId: cinemaVenueLookup.byMoreId.size,
      venuesWithBundleCode: cinemaVenueBundleCount,
      createdFromMovies: 0,
      createdFromVenues: 0,
      createdCinemaVenues: 0,
      createdCinemaVenuesList: [],
      byMovie: [],
      byVenue: [],
      missingVenueIds: [],
    };
  }
  movieReport.moviesScanned = totalMoviesScanned;

  let theaterReport = null;
  let theaterEventIdIndex = new Map();
  if (runTheater) {
    await loadPersistedTheaterEventIdsIntoIndex(strapi, theaterEventIdIndex, progress);
  }
  let theaterCodeCount = 0;
  let totalTheaterScanned = 0;

  if (runTheater) {
    progress(
      `${theaterStepPrefix}Βήμα 2/3: παραστάσεις CMS (σειρά id) — νέοι χώροι + παραστάσεις από More κωδικό…`,
    );
  }

  if (runTheater && theaterShowIdFilter != null) {
    const theaterShows = await loadTheaterShowsWithCodesPage(strapi, {
      page: 1,
      pageSize: 1,
      theaterShowIdFilter,
    });
    totalTheaterScanned = theaterShows.length;
    for (const show of theaterShows) theaterCodeCount += collectEventGroupCodes(show).length;
    progress('Φόρτωση υπαρχουσών παραστάσεων (μία παράσταση)…');
    const performanceExistenceIndex = await loadPerformanceExistenceIndex(
      strapi,
      theaterShows.map((s) => s.id),
      now,
    );
    const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
    await prefetchEventCodes(eventsCache, collectCodesFromTheaterShows(theaterShows), progress);
    theaterReport = await syncTheaterPerformancesFromMore(strapi, {
      theaterShows,
      venueLookup: theaterVenueLookup,
      venuesWithBundle: [],
      eventsCache,
      now,
      venuePresenceIndex,
      onProgress: progress,
      totalShowsCount: theaterShows.length || 1,
      performanceExistenceIndex,
      eventIdPersistQueue,
    });
    theaterEventIdIndex = theaterReport.eventIdIndex || theaterEventIdIndex;
    eventsCache.clear();
    maybeGc();
  } else if (runTheater) {
    progress('Σάρωση CMS: ποιες παραστάσεις έχουν More κωδικό…');
    const showsWithCodes = await listTheaterShowsWithSyncCodes(strapi, progress);
    const totalWithCodes = showsWithCodes.length;
    const theaterEventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
    let performanceExistenceIndex = null;
    if (!totalWithCodes) {
      progress('Δεν βρέθηκαν παραστάσεις με More κωδικό στο CMS — skip παραστάσεων.');
    } else {
      progress(
        `Βρέθηκαν ${totalWithCodes} παραστάσεις με More κωδικό — φόρτωση υπαρχουσών παραστάσεων…`,
      );
      performanceExistenceIndex = await loadPerformanceExistenceIndex(
        strapi,
        showsWithCodes.map((entry) => entry.id),
        now,
      );
      progress(
        `Συγχρονισμός παραστάσεων 1/${totalWithCodes}…`,
      );
      for (let offset = 0; offset < showsWithCodes.length; offset += THEATER_BATCH_SIZE) {
        const slice = showsWithCodes.slice(offset, offset + THEATER_BATCH_SIZE);
        for (const entry of slice) {
          theaterCodeCount += entry.codes.length;
        }
        const theaterShows = await loadTheaterShowsForSyncBatch(strapi, slice);
        totalTheaterScanned += theaterShows.length;
        await prefetchEventCodes(
          theaterEventsCache,
          collectCodesFromTheaterShows(theaterShows),
          progress,
        );
        const partial = await syncTheaterPerformancesFromMore(strapi, {
          theaterShows,
          venueLookup: theaterVenueLookup,
          venuesWithBundle: [],
          eventsCache: theaterEventsCache,
          now,
          venuePresenceIndex,
          onProgress: progress,
          skipVenueBundles: true,
          eventIdIndex: theaterEventIdIndex,
          totalShowsCount: totalWithCodes,
          performanceExistenceIndex,
          eventIdPersistQueue,
        });
        theaterEventIdIndex = partial.eventIdIndex || theaterEventIdIndex;
        theaterReport = mergeTheaterSyncReports(theaterReport, partial);
        maybeGc();
        await yieldEventLoop();
        progress(
          `Παραστάσεις: ${Math.min(offset + theaterShows.length, totalWithCodes)}/${totalWithCodes} ολοκληρώθηκαν`,
        );
      }
    }

    progress(
      `${theaterStepPrefix}Βήμα 3/3: χώροι θεάτρου CMS (σειρά id) — παραστάσεις από bundle codes…`,
    );
    const allTheaterVenueRows = await loadVenueBundleRows(strapi, 'theater', progress);
    theaterVenuesWithBundle = venuesWithBundleFromRows(
      allTheaterVenueRows,
      collectTheaterVenueBundleCodes,
      { onlyWithBundles: false },
    );
    const theaterVenuesWithBundleCodes = theaterVenuesWithBundle.filter(
      (v) => v.bundleCodes.length > 0,
    );
    theaterVenueBundleCount = theaterVenuesWithBundleCodes.length;
    if (theaterVenuesWithBundle.length) {
      progress(
        `Χώροι θεάτρου CMS: ${theaterVenuesWithBundle.length} συνολικά · ${theaterVenueBundleCount} με bundle codes…`,
      );
      await prefetchEventCodes(
        theaterEventsCache,
        collectCodesFromVenueBundles(theaterVenuesWithBundle),
        progress,
      );
      const bundlePart = await syncTheaterPerformancesFromMore(strapi, {
        theaterShows: [],
        venueLookup: theaterVenueLookup,
        venuesWithBundle: theaterVenuesWithBundle,
        eventsCache: theaterEventsCache,
        now,
        venuePresenceIndex,
        onProgress: progress,
        skipShowLoop: true,
        eventIdIndex: theaterEventIdIndex,
        totalVenuesCount: theaterVenuesWithBundle.length,
        performanceExistenceIndex,
        eventIdPersistQueue,
      });
      theaterReport = mergeTheaterSyncReports(theaterReport, bundlePart);
    } else {
      progress('Δεν βρέθηκαν χώροι θεάτρου στο CMS — skip bundles.');
    }
    theaterEventsCache.clear();
    maybeGc();
  }

  if (!theaterReport) {
    theaterReport = {
      ...emptySyncCounters(),
      theaterShowsScanned: 0,
      theaterVenuesWithMoreId: theaterVenueLookup.byMoreId.size,
      theaterVenuesWithBundleCode: theaterVenueBundleCount,
      createdFromTheaterShows: 0,
      createdFromTheaterVenues: 0,
      createdTheaterVenues: 0,
      createdTheaterVenuesList: [],
      byTheaterShow: [],
      byTheaterVenue: [],
      missingVenueIds: [],
    };
  }
  theaterReport.theaterShowsScanned = totalTheaterScanned;

  const persistedEventIds = await flushEventIdPersistQueue(strapi, eventIdPersistQueue, {
    onProgress: progress,
  });

  progress(
    `Χώροι: ${allVenueRows.length} CMS · ${globalVenueLookup.byMoreId.size} με More venue_id` +
      (runCinema
        ? ` · ${cinemaVenuesWithBundle.length} σινεμά CMS (${cinemaVenueBundleCount} με bundle)`
        : '') +
      (runTheater
        ? ` · ${theaterVenuesWithBundle.length} χώροι θεάτρου CMS (${theaterVenueBundleCount} με bundle)`
        : ''),
  );

  const cinemaVenueCodeCount = cinemaVenuesWithBundle.reduce(
    (sum, venue) => sum + venue.bundleCodes.length,
    0,
  );
  const theaterVenueCodeCount = theaterVenuesWithBundle.reduce(
    (sum, venue) => sum + venue.bundleCodes.length,
    0,
  );

  const createdFromBuckets =
    movieReport.createdFromMovies +
    movieReport.createdFromVenues +
    theaterReport.createdFromTheaterShows +
    theaterReport.createdFromTheaterVenues;

  // Ανεξάρτητη επαλήθευση: μέτρα όσες more_sync εγγραφές μπήκαν όντως στη βάση σε αυτό
  // το τρέξιμο (createdAt >= started). Αν η αναφορά υπολείπεται, εδώ θα φανεί η απόκλιση.
  const dbCreated = await countMoreSyncCreatedSince(strapi, started);

  // Headline = ό,τι μεγαλύτερο μεταξύ μετρητών sync και πραγματικών inserts στη βάση,
  // ώστε το «Νέες» να μην υπολείπεται ποτέ των πραγματικά προστιθέμενων προβολών.
  const created = Math.max(createdFromBuckets, dbCreated.total);

  if (createdFromBuckets !== dbCreated.total) {
    strapi.log.warn(
      `[more-showtime-sync] ασυμφωνία «Νέες»: μετρητές=${createdFromBuckets} ` +
        `(ταινίες=${movieReport.createdFromMovies} σινεμά_bundle=${movieReport.createdFromVenues} ` +
        `θέατρο=${theaterReport.createdFromTheaterShows} θέατρο_bundle=${theaterReport.createdFromTheaterVenues}) ` +
        `· πραγματικά_στη_βάση=${dbCreated.total} (showtimes=${dbCreated.showtimes} performances=${dbCreated.performances})`,
    );
  }

  const report = {
    ok: true,
    at: new Date().toISOString(),
    scope,
    moviesScanned: movieReport.moviesScanned,
    movieEventGroupCodesTotal: movieCodeCount,
    moviesWithMultipleEventGroupCodes: moviesWithSecondaryCodes,
    theaterShowsScanned: theaterReport.theaterShowsScanned,
    venuesWithMoreId: movieReport.venuesWithMoreId,
    venuesWithBundleCode: movieReport.venuesWithBundleCode,
    theaterVenuesWithMoreId: theaterReport.theaterVenuesWithMoreId,
    theaterVenuesWithBundleCode: theaterReport.theaterVenuesWithBundleCode,
    created,
    createdFromBuckets,
    createdInDb: dbCreated.total,
    createdInDbShowtimes: dbCreated.showtimes,
    createdInDbPerformances: dbCreated.performances,
    createdFromMovies: movieReport.createdFromMovies,
    createdFromVenues: movieReport.createdFromVenues,
    createdFromTheaterShows: theaterReport.createdFromTheaterShows,
    createdFromTheaterVenues: theaterReport.createdFromTheaterVenues,
    createdTheaterVenues: theaterReport.createdTheaterVenues,
    createdTheaterVenuesList: theaterReport.createdTheaterVenuesList,
    createdCinemaVenues: movieReport.createdCinemaVenues,
    createdCinemaVenuesList: movieReport.createdCinemaVenuesList,
    venueUpdatedStatuses: movieReport.venueUpdatedStatuses,
    alreadyExists: movieReport.alreadyExists + theaterReport.alreadyExists,
    updatedSoldOut: theaterReport.updatedSoldOut,
    skippedPast: movieReport.skippedPast + theaterReport.skippedPast,
    skippedNoVenue: movieReport.skippedNoVenue + theaterReport.skippedNoVenue,
    skippedUnknownEventId:
      movieReport.skippedUnknownEventId + theaterReport.skippedUnknownEventId,
    resolvedViaVenueScrape:
      (movieReport.resolvedViaVenueScrape || 0) + (theaterReport.resolvedViaVenueScrape || 0),
    persistedEventIdCache: persistedEventIds.entries,
    persistedEventIdEntriesUpdated: persistedEventIds.persisted,
    skippedInvalidDate: movieReport.skippedInvalidDate + theaterReport.skippedInvalidDate,
    errors: [...movieReport.errors, ...theaterReport.errors],
    byMovie: movieReport.byMovie,
    byVenue: movieReport.byVenue,
    byTheaterShow: theaterReport.byTheaterShow,
    byTheaterVenue: theaterReport.byTheaterVenue,
    missingVenueIds: [...movieReport.missingVenueIds, ...theaterReport.missingVenueIds],
    missingCinemaVenueIds: movieReport.missingVenueIds,
    missingTheaterVenueIds: theaterReport.missingVenueIds,
    movieNote: movieReport.note,
    theaterNote: theaterReport.note,
    durationMs: Date.now() - started,
  };

  const scopePrefix =
    scope === 'cinema' ? 'Σινεμά · ' : scope === 'theater' ? 'Θέατρο · ' : '';

  report.message =
    scopePrefix +
    `Νέες: ${created} (ταινίες: ${report.createdFromMovies} · σινεμά bundle: ${report.createdFromVenues}` +
    ` · θέατρο: ${report.createdFromTheaterShows} · θέατρο bundle: ${report.createdFromTheaterVenues})` +
    (dbCreated.total !== createdFromBuckets
      ? ` · στη βάση: ${dbCreated.total} (showtimes ${dbCreated.showtimes} · παραστάσεις ${dbCreated.performances})`
      : '') +
    ` · υπήρχαν: ${report.alreadyExists}` +
    (report.createdCinemaVenues
      ? ` · νέα σινεμά: ${report.createdCinemaVenues}`
      : '') +
    (report.venueUpdatedStatuses?.updated || report.venueUpdatedStatuses?.preserved_complete
      ? ` · updated: ${report.venueUpdatedStatuses.complete} πλήρη` +
        (report.venueUpdatedStatuses.preserved_complete
          ? ` (${report.venueUpdatedStatuses.preserved_complete} ήδη complete)`
          : '') +
        ` · ${report.venueUpdatedStatuses.needs_manual} χειροκίνητα` +
        (report.venueUpdatedStatuses.pending_complete_until_monday
          ? ` · ${report.venueUpdatedStatuses.pending_complete_until_monday} έτοιμα (Δευτέρα+)`
          : '')
      : '') +
    (report.createdTheaterVenues
      ? ` · νέοι χώροι θεάτρου: ${report.createdTheaterVenues}`
      : '') +
    (report.updatedSoldOut ? ` · sold out ενημ.: ${report.updatedSoldOut}` : '') +
    ` · χωρίς venue_id: ${report.skippedNoVenue}` +
    (report.missingVenueIds?.length
      ? ` · λείπουν ${report.missingVenueIds.length} More venueId από CMS`
      : '') +
    ` · άγνωστο eventId: ${report.skippedUnknownEventId}` +
    (report.resolvedViaVenueScrape
      ? ` · scrape→ταινία/παράσταση: ${report.resolvedViaVenueScrape}`
      : '');

  strapi.log.info(
    `[more-showtime-sync] movies=${report.moviesScanned} evgCodes=${report.movieEventGroupCodesTotal} (${report.moviesWithMultipleEventGroupCodes} με επιπλέον more_event_groups) theater=${report.theaterShowsScanned} created=${report.created} (buckets=${report.createdFromBuckets} db=${report.createdInDb}) exists=${report.alreadyExists} unknownEventId=${report.skippedUnknownEventId} (${report.durationMs}ms)`,
  );

  return report;
}

/** Βαθύ merge δύο τιμών report: αριθμοί→άθροισμα, arrays→concat, objects→αναδρομικά. */
function mergeReportValue(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (typeof a === 'number' && typeof b === 'number') return a + b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a && b;
  if (typeof a === 'object' && typeof b === 'object') {
    const out = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out[key] = mergeReportValue(a[key], b[key]);
    }
    return out;
  }
  return b !== undefined && b !== '' ? b : a;
}

/**
 * Συνδυάζει per-phase reports (cinema + theater) σε ένα ενιαίο report.
 * Χρησιμοποιείται από το chained worker («Όλα» = δύο σειριακά processes).
 */
function combineSyncReports(reports) {
  const list = (reports || []).filter(Boolean);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];

  const merged = list.reduce((acc, r) => mergeReportValue(acc, r));
  merged.scope = 'all';
  merged.ok = list.every((r) => r.ok !== false);
  merged.at = new Date().toISOString();

  merged.message =
    `Νέες: ${merged.created} (ταινίες: ${merged.createdFromMovies} · σινεμά bundle: ${merged.createdFromVenues}` +
    ` · θέατρο: ${merged.createdFromTheaterShows} · θέατρο bundle: ${merged.createdFromTheaterVenues})` +
    ` · υπήρχαν: ${merged.alreadyExists}` +
    (merged.createdCinemaVenues ? ` · νέα σινεμά: ${merged.createdCinemaVenues}` : '') +
    (merged.createdTheaterVenues ? ` · νέοι χώροι θεάτρου: ${merged.createdTheaterVenues}` : '') +
    (merged.updatedSoldOut ? ` · sold out ενημ.: ${merged.updatedSoldOut}` : '') +
    ` · χωρίς venue_id: ${merged.skippedNoVenue}` +
    ` · άγνωστο eventId: ${merged.skippedUnknownEventId}`;

  return merged;
}

module.exports = {
  syncShowtimesFromMore,
  combineSyncReports,
  parseMoreEventDatetime,
};
