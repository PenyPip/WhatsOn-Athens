'use strict';

const { fetchMoreEventsByGroupCode } = require('./moreApi');
const {
  collectEventGroupCodes,
  collectVenueBundleCodes,
  collectTheaterVenueBundleCodes,
  normalizeMoreVenueId,
  moreVenueIdLookupKeys,
} = require('./moreEventGroupCodes');
const {
  createVenueScrapeCache,
  SCRAPE_ENABLED,
  SCRAPE_ON_SYNC,
} = require('./moreVenueProgramScrape');
const { findBestCmsMatchByPlayTitle } = require('./morePlayTitleMatch');
const {
  createVenueSyncStatsTracker,
  applyCinemaVenueUpdatedStatuses,
  migrateVenueUpdatedBooleanToEnum,
} = require('../api/venue/services/venue-updated-status');
const { buildMoreImportTrace } = require('./moreImportTrace');

const MOVIE_FETCH_DELAY_MS = Number(process.env.MORE_SHOWTIME_SYNC_DELAY_MS || 250);
const EVENTS_CACHE_MAX = Number(process.env.MORE_SHOWTIME_SYNC_EVENTS_CACHE_MAX || 16);
const MOVIE_BATCH_SIZE = Number(process.env.MORE_SHOWTIME_SYNC_MOVIE_BATCH || 6);
const THEATER_BATCH_SIZE = Number(process.env.MORE_SHOWTIME_SYNC_THEATER_BATCH || 6);
const PREFETCH_ENABLED = process.env.MORE_SHOWTIME_SYNC_PREFETCH === 'true';

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function yieldEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function createEventsCache(fetchDelayMs) {
  const cache = new Map();

  function trimCache() {
    while (cache.size > EVENTS_CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  async function fetchAndStore(key) {
    let events = [];
    try {
      events = await fetchMoreEventsByGroupCode(key);
    } catch (e) {
      const msg = e?.message || String(e);
      console.warn(`[more-showtime-sync] getevents failed (${key}): ${msg}`);
      events = [];
    }
    cache.set(key, events);
    trimCache();
    return events;
  }

  return {
    size() {
      return cache.size;
    },
    clear() {
      cache.clear();
    },
    async get(code) {
      const key = String(code || '').trim();
      if (!key) return [];
      if (cache.has(key)) return cache.get(key);
      const events = await fetchAndStore(key);
      if (fetchDelayMs > 0) await sleep(fetchDelayMs);
      if (cache.size % 8 === 0) await yieldEventLoop();
      return events;
    },
    /** Παράλληλο prefetch μοναδικών κωδικών — πολύ πιο γρήγορο από σειριακό sync. */
    async prefetchAll(codes, options = {}) {
      const concurrency = Number(
        options.concurrency ?? process.env.MORE_SHOWTIME_SYNC_CONCURRENCY ?? 2,
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
          await fetchAndStore(key);
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
      return { total: unique.length, fetched };
    },
  };
}

async function findAllEntities(strapi, uid, options = {}) {
  const pageSize = options.pageSize ?? 200;
  const base = { ...options };
  delete base.pageSize;
  let page = 1;
  const all = [];
  for (;;) {
    const rows = await strapi.entityService.findMany(uid, {
      ...base,
      pagination: { page, pageSize },
    });
    const list = Array.isArray(rows) ? rows : [];
    all.push(...list);
    if (list.length < pageSize) break;
    page += 1;
    if (page % 3 === 0) await yieldEventLoop();
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

/** Όλοι οι χώροι με venue_id — κοινό lookup ταινιών/θεάτρου (χωρίς φίλτρο type). */
async function loadGlobalVenueLookup(strapi) {
  const rows = await findAllEntities(strapi, 'api::venue.venue', {
    filters: { venue_id: { $notNull: true } },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'type'],
    publicationState: 'preview',
    pageSize: 200,
  });
  return buildVenueLookup(rows.filter((v) => normalizeMoreVenueId(v.venue_id)));
}

/** Ευρετήριο venue_id + ονόματος — ένα load, χωρίς DB query ανά event (αποφυγή timeout). */
async function buildVenuePresenceIndex(strapi) {
  const rows = await findAllEntities(strapi, 'api::venue.venue', {
    fields: ['id', 'name', 'venue_id'],
    publicationState: 'preview',
    pageSize: 200,
  });
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

/** Όλοι οι χώροι με venue_id — για θέατρο (συμπεριλαμβάνει type other, όχι μόνο theater). */
async function loadTheaterVenueLookup(strapi) {
  const rows = await findAllEntities(strapi, 'api::venue.venue', {
    filters: {
      venue_id: { $notNull: true },
      type: { $ne: 'cinema' },
    },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'type'],
    publicationState: 'preview',
    pageSize: 200,
  });
  return buildVenueLookup(rows.filter((v) => normalizeMoreVenueId(v.venue_id)));
}

/** Θεατρικοί/άλλοι χώροι με venue bundle codes (όχι σινεμά). */
async function loadTheaterVenuesWithBundleCodes(strapi) {
  const rows = await findAllEntities(strapi, 'api::venue.venue', {
    filters: { type: { $ne: 'cinema' } },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'event_group_code', 'more_link', 'type'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pageSize: 200,
  });
  return rows
    .map((venue) => ({
      ...venue,
      bundleCodes: collectTheaterVenueBundleCodes(venue),
    }))
    .filter((venue) => venue.bundleCodes.length > 0);
}

async function loadVenuesWithBundleCodes(strapi, venueType, collectBundleFn) {
  const filters = {};
  if (venueType) filters.type = venueType;
  const rows = await findAllEntities(strapi, 'api::venue.venue', {
    filters,
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'event_group_code', 'more_link'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pageSize: 200,
  });
  return rows
    .map((venue) => ({
      ...venue,
      bundleCodes: collectBundleFn(venue),
    }))
    .filter((venue) => venue.bundleCodes.length > 0);
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
  const rows = await strapi.entityService.findMany('api::movie.movie', {
    filters,
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { page, pageSize },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((m) => collectEventGroupCodes(m).length > 0);
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
  const rows = await strapi.entityService.findMany('api::theater-show.theater-show', {
    filters,
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { page, pageSize },
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
  return target;
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
  return target;
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

async function showtimeExistsAt(strapi, { movieId, venueId, datetime }) {
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

async function findPerformanceAt(strapi, { theaterShowId, venueId, datetime }) {
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

async function upsertShowtimeFromEvent(strapi, report, {
  event,
  movieId,
  venue,
  now,
  statsTarget,
  eventGroupCode,
  syncPath,
  contentResolution,
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

  const exists = await showtimeExistsAt(strapi, {
    movieId,
    venueId: venue.id,
    datetime,
  });

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

  const existing = await findPerformanceAt(strapi, {
    theaterShowId,
    venueId: venue.id,
    datetime,
  });

  if (existing) {
    const currentSoldOut = existing.sold_out === true;
    if (currentSoldOut !== soldOut) {
      await strapi.entityService.update('api::theater-performance.theater-performance', existing.id, {
        data: { sold_out: soldOut },
      });
      report.updatedSoldOut += 1;
      if (statsTarget) statsTarget.updatedSoldOut = (statsTarget.updatedSoldOut || 0) + 1;
      return 'updated_sold_out';
    }
    report.alreadyExists += 1;
    if (statsTarget) statsTarget.alreadyExists += 1;
    return 'exists';
  }

  await strapi.entityService.create('api::theater-performance.theater-performance', {
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

async function loadCmsEntriesForPlayTitleMatch(strapi, uid, fields) {
  return findAllEntities(strapi, uid, {
    fields,
    publicationState: 'preview',
    pageSize: 200,
  });
}

async function resolveCinemaMovieFromEventId({
  eventId,
  eventIdIndex,
  supplementalIndex,
  scrapeCache,
  venue,
  moviesForTitle,
  report,
}) {
  const primary = eventIdIndex.get(eventId);
  if (primary) return primary;

  const cached = supplementalIndex.get(eventId);
  if (cached) return cached;

  const link = venue?.more_link || venue?.moreLink;
  if (!SCRAPE_ENABLED || !SCRAPE_ON_SYNC || !link || !moviesForTitle?.length) return null;

  const scrape = await scrapeCache.get(link);
  const row = scrape?.byEventId?.get(eventId);
  if (!row?.playTitle) return null;

  const match = findBestCmsMatchByPlayTitle(
    row.playTitle,
    moviesForTitle.map((m) => ({ ...m, contentType: 'movie' })),
  );
  if (!match) return null;

  const mapped = {
    movieId: match.cmsId,
    movieTitle: match.cmsTitle,
    viaScrape: true,
    playTitle: row.playTitle,
    matchScore: match.score,
  };
  supplementalIndex.set(eventId, mapped);
  report.resolvedViaVenueScrape = (report.resolvedViaVenueScrape || 0) + 1;
  return mapped;
}

async function resolveTheaterShowFromEventId({
  eventId,
  eventIdIndex,
  supplementalIndex,
  scrapeCache,
  venue,
  showsForTitle,
  report,
}) {
  const primary = eventIdIndex.get(eventId);
  if (primary) return primary;

  const cached = supplementalIndex.get(eventId);
  if (cached) return cached;

  const link = venue?.more_link || venue?.moreLink;
  if (!SCRAPE_ENABLED || !SCRAPE_ON_SYNC || !link || !showsForTitle?.length) return null;

  const scrape = await scrapeCache.get(link);
  const row = scrape?.byEventId?.get(eventId);
  if (!row?.playTitle) return null;

  const match = findBestCmsMatchByPlayTitle(
    row.playTitle,
    showsForTitle.map((s) => ({ ...s, contentType: 'theater_show' })),
  );
  if (!match) return null;

  const mapped = {
    theaterShowId: match.cmsId,
    showTitle: match.cmsTitle,
    viaScrape: true,
    playTitle: row.playTitle,
    matchScore: match.score,
  };
  supplementalIndex.set(eventId, mapped);
  report.resolvedViaVenueScrape = (report.resolvedViaVenueScrape || 0) + 1;
  return mapped;
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
  eventIdIndex: sharedEventIdIndex,
}) {
  const report = {
    ...emptySyncCounters(),
    moviesScanned: movies.length,
    venuesWithMoreId: venueLookup.byMoreId.size,
    venuesWithBundleCode: venuesWithBundle.length,
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
  const venueSyncTracker = createVenueSyncStatsTracker();
  const scrapeCache = createVenueScrapeCache();
  const supplementalEventIndex = new Map();
  const moviesForTitle = venuesWithBundle.length
    ? await loadCmsEntriesForPlayTitleMatch(strapi, 'api::movie.movie', [
        'id',
        'title',
        'slug',
        'original_title',
      ])
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

  if (!skipMovieLoop) for (let movieIndex = 0; movieIndex < movies.length; movieIndex += 1) {
    const movie = movies[movieIndex];
    if (onProgress && movieIndex > 0 && movieIndex % 5 === 0) {
      onProgress(`Συγχρονισμός ταινιών: ${movieIndex}/${movies.length}…`);
    }
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

    for (const code of codes) {
      try {
        const events = await eventsCache.get(code);

        for (const event of events) {
          const eventId = String(event.eventId ?? '').trim();
          if (eventId && !eventIdIndex.has(eventId)) {
            eventIdIndex.set(eventId, { movieId: movie.id, movieTitle: movie.title });
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

          venueSyncTracker.touch(venue.id);
          const result = await upsertShowtimeFromEvent(strapi, report, {
            event,
            movieId: movie.id,
            venue,
            now,
            statsTarget: movieStats,
            eventGroupCode: code,
            syncPath: 'movie_event_group',
            contentResolution: { movieId: movie.id, movieTitle: movie.title },
          });
          venueSyncTracker.recordUpsertResult(venue.id, result);
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

    if (movieStats.created > 0 || movieStats.alreadyExists > 0 || movieStats.skipped > 0) {
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

  if (!skipVenueBundles) for (const venue of venuesWithBundle) {
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

    for (const code of venue.bundleCodes) {
      try {
        const events = await eventsCache.get(code);

        for (const event of events) {
          const eventId = String(event.eventId ?? '').trim();
          const mapped = await resolveCinemaMovieFromEventId({
            eventId,
            eventIdIndex,
            supplementalIndex: supplementalEventIndex,
            scrapeCache,
            venue,
            moviesForTitle,
            report,
          });
          if (!mapped) {
            report.skippedUnknownEventId += 1;
            venueStats.skippedUnknownEventId += 1;
            venueStats.skipped += 1;
            venueSyncTracker.record(venue.id, { skippedUnknownEventId: 1 });
            continue;
          }

          if (venue.venue_id) {
            const moreVenueId = String(event.venueId ?? '').trim();
            const expected = String(venue.venue_id).trim();
            if (expected && moreVenueId && moreVenueId !== expected) {
              venueStats.skipped += 1;
              venueStats.skippedVenueMismatch += 1;
              venueSyncTracker.record(venue.id, { skippedVenueMismatch: 1 });
              continue;
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
          });
          venueSyncTracker.recordUpsertResult(venue.id, result);
          if (result === 'created') report.createdFromVenues += 1;
        }
      } catch (e) {
        const msg = e?.message || String(e);
        venueStats.errors = (venueStats.errors || 0) + 1;
        venueSyncTracker.record(venue.id, { errors: 1 });
        pushSyncError(report, errorDedup, {
          venueId: venue.id,
          name: venue.name,
          code,
          error: msg,
        });
        strapi.log.warn(`[more-showtime-sync] venue ${venue.id} (${code}): ${msg}`);
      }
    }

    if (
      venueStats.created > 0 ||
      venueStats.alreadyExists > 0 ||
      venueStats.skippedUnknownEventId > 0
    ) {
      report.byVenue.push(venueStats);
    }
  }

  if (!skipVenueBundles && venueSyncTracker.entries().length > 0) {
    await migrateVenueUpdatedBooleanToEnum(strapi);
    report.venueUpdatedStatuses = await applyCinemaVenueUpdatedStatuses(strapi, venueSyncTracker, {
      autoCreatedVenueIds: (report.createdCinemaVenuesList || []).map((v) => v.id),
    });
  }

  report.eventIdIndex = eventIdIndex;
  return report;
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
}) {
  const report = {
    ...emptySyncCounters(),
    theaterShowsScanned: theaterShows.length,
    theaterVenuesWithMoreId: venueLookup.byMoreId.size,
    theaterVenuesWithBundleCode: venuesWithBundle.length,
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
  const scrapeCache = createVenueScrapeCache();
  const supplementalEventIndex = new Map();
  const showsForTitle = venuesWithBundle.length
    ? await loadCmsEntriesForPlayTitleMatch(strapi, 'api::theater-show.theater-show', [
        'id',
        'title',
        'slug',
      ])
    : [];

  const eventIdIndex = sharedEventIdIndex || new Map();

  if (!skipShowLoop) for (let showIndex = 0; showIndex < theaterShows.length; showIndex += 1) {
    const show = theaterShows[showIndex];
    if (onProgress && showIndex > 0 && showIndex % 5 === 0) {
      onProgress(`Συγχρονισμός θεάτρου: ${showIndex}/${theaterShows.length}…`);
    }
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

    for (const code of codes) {
      try {
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

          const result = await upsertPerformanceFromEvent(strapi, report, {
            event,
            theaterShowId: show.id,
            venue,
            now,
            statsTarget: showStats,
            eventGroupCode: code,
            syncPath: 'theater_show_event_group',
            contentResolution: { theaterShowId: show.id, theaterShowTitle: show.title },
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

  if (!skipVenueBundles) for (const venue of venuesWithBundle) {
    const venueStats = {
      venueId: venue.id,
      name: venue.name,
      bundleCodes: venue.bundleCodes,
      created: 0,
      alreadyExists: 0,
      skipped: 0,
      skippedUnknownEventId: 0,
    };

    for (const code of venue.bundleCodes) {
      try {
        const events = await eventsCache.get(code);

        for (const event of events) {
          const eventId = String(event.eventId ?? '').trim();
          const mapped = await resolveTheaterShowFromEventId({
            eventId,
            eventIdIndex,
            supplementalIndex: supplementalEventIndex,
            scrapeCache,
            venue,
            showsForTitle,
            report,
          });
          if (!mapped) {
            report.skippedUnknownEventId += 1;
            venueStats.skippedUnknownEventId += 1;
            venueStats.skipped += 1;
            continue;
          }

          if (venue.venue_id) {
            const moreVenueId = String(event.venueId ?? '').trim();
            const expected = String(venue.venue_id).trim();
            if (expected && moreVenueId && moreVenueId !== expected) {
              venueStats.skipped += 1;
              continue;
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
          });
          if (result === 'created') report.createdFromTheaterVenues += 1;
        }
      } catch (e) {
        const msg = e?.message || String(e);
        pushSyncError(report, errorDedup, {
          venueId: venue.id,
          name: venue.name,
          code,
          error: msg,
        });
        strapi.log.warn(`[more-theater-sync] venue ${venue.id} (${code}): ${msg}`);
      }
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
  return report;
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

  progress('Φόρτωση χώρων CMS…');
  const globalVenueLookup = await loadGlobalVenueLookup(strapi);
  const venuePresenceIndex = await buildVenuePresenceIndex(strapi);
  const cinemaVenueLookup = globalVenueLookup;
  const cinemaVenuesWithBundle = await loadVenuesWithBundleCodes(
    strapi,
    'cinema',
    collectVenueBundleCodes,
  );
  const theaterVenueLookup = globalVenueLookup;
  const theaterVenuesWithBundle = await loadTheaterVenuesWithBundleCodes(strapi);

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

  progress('Συγχρονισμός ταινιών (batches, χαμηλή μνήμη)…');

  if (movieIdFilter != null) {
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
    const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
    movieReport = await syncMovieShowtimesFromMore(strapi, {
      movies,
      venueLookup: cinemaVenueLookup,
      venuesWithBundle: cinemaVenuesWithBundle,
      eventsCache,
      now,
      venuePresenceIndex,
      onProgress: progress,
    });
    cinemaEventIdIndex = movieReport.eventIdIndex || cinemaEventIdIndex;
    eventsCache.clear();
    maybeGc();
  } else {
    for (let page = 1; ; page += 1) {
      const movies = await loadMoviesWithCodesPage(strapi, {
        page,
        pageSize: MOVIE_BATCH_SIZE,
      });
      if (!movies.length) break;
      totalMoviesScanned += movies.length;
      for (const movie of movies) {
        const codes = collectEventGroupCodes(movie);
        movieCodeCount += codes.length;
        if (codes.length > 1) moviesWithSecondaryCodes += 1;
      }
      const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
      const partial = await syncMovieShowtimesFromMore(strapi, {
        movies,
        venueLookup: cinemaVenueLookup,
        venuesWithBundle: [],
        eventsCache,
        now,
        venuePresenceIndex,
        onProgress: progress,
        skipVenueBundles: true,
        eventIdIndex: cinemaEventIdIndex,
      });
      cinemaEventIdIndex = partial.eventIdIndex || cinemaEventIdIndex;
      movieReport = mergeMovieSyncReports(movieReport, partial);
      eventsCache.clear();
      maybeGc();
      await yieldEventLoop();
      progress(`Ταινίες: ${totalMoviesScanned} επεξεργασμένες (batch ${page})…`);
    }

    if (cinemaVenuesWithBundle.length) {
      progress('Σινεμά venue bundles…');
      const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
      const bundlePart = await syncMovieShowtimesFromMore(strapi, {
        movies: [],
        venueLookup: cinemaVenueLookup,
        venuesWithBundle: cinemaVenuesWithBundle,
        eventsCache,
        now,
        venuePresenceIndex,
        onProgress: progress,
        skipMovieLoop: true,
        eventIdIndex: cinemaEventIdIndex,
      });
      movieReport = mergeMovieSyncReports(movieReport, bundlePart);
      eventsCache.clear();
      maybeGc();
    }
  }

  if (!movieReport) {
    movieReport = {
      ...emptySyncCounters(),
      moviesScanned: 0,
      venuesWithMoreId: cinemaVenueLookup.byMoreId.size,
      venuesWithBundleCode: cinemaVenuesWithBundle.length,
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
  let theaterCodeCount = 0;
  let totalTheaterScanned = 0;

  progress('Συγχρονισμός θεάτρου (batches)…');

  if (theaterShowIdFilter != null) {
    const theaterShows = await loadTheaterShowsWithCodesPage(strapi, {
      page: 1,
      pageSize: 1,
      theaterShowIdFilter,
    });
    totalTheaterScanned = theaterShows.length;
    for (const show of theaterShows) theaterCodeCount += collectEventGroupCodes(show).length;
    const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
    theaterReport = await syncTheaterPerformancesFromMore(strapi, {
      theaterShows,
      venueLookup: theaterVenueLookup,
      venuesWithBundle: theaterVenuesWithBundle,
      eventsCache,
      now,
      venuePresenceIndex,
      onProgress: progress,
    });
    eventsCache.clear();
    maybeGc();
  } else {
    for (let page = 1; ; page += 1) {
      const theaterShows = await loadTheaterShowsWithCodesPage(strapi, {
        page,
        pageSize: THEATER_BATCH_SIZE,
      });
      if (!theaterShows.length) break;
      totalTheaterScanned += theaterShows.length;
      for (const show of theaterShows) theaterCodeCount += collectEventGroupCodes(show).length;
      const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
      const partial = await syncTheaterPerformancesFromMore(strapi, {
        theaterShows,
        venueLookup: theaterVenueLookup,
        venuesWithBundle: [],
        eventsCache,
        now,
        venuePresenceIndex,
        onProgress: progress,
        skipShowLoop: false,
        skipVenueBundles: true,
        eventIdIndex: theaterEventIdIndex,
      });
      theaterEventIdIndex = partial.eventIdIndex || theaterEventIdIndex;
      theaterReport = mergeTheaterSyncReports(theaterReport, partial);
      eventsCache.clear();
      maybeGc();
      await yieldEventLoop();
      progress(`Θέατρο: ${totalTheaterScanned} παραστάσεις (batch ${page})…`);
    }

    if (theaterVenuesWithBundle.length) {
      progress('Θέατρο venue bundles…');
      const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
      const bundlePart = await syncTheaterPerformancesFromMore(strapi, {
        theaterShows: [],
        venueLookup: theaterVenueLookup,
        venuesWithBundle: theaterVenuesWithBundle,
        eventsCache,
        now,
        venuePresenceIndex,
        onProgress: progress,
        skipShowLoop: true,
        eventIdIndex: theaterEventIdIndex,
      });
      theaterReport = mergeTheaterSyncReports(theaterReport, bundlePart);
      eventsCache.clear();
      maybeGc();
    }
  }

  if (!theaterReport) {
    theaterReport = {
      ...emptySyncCounters(),
      theaterShowsScanned: 0,
      theaterVenuesWithMoreId: theaterVenueLookup.byMoreId.size,
      theaterVenuesWithBundleCode: theaterVenuesWithBundle.length,
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

  report.message =
    `Νέες: ${created} (ταινίες: ${report.createdFromMovies} · σινεμά bundle: ${report.createdFromVenues}` +
    ` · θέατρο: ${report.createdFromTheaterShows} · θέατρο bundle: ${report.createdFromTheaterVenues})` +
    (dbCreated.total !== createdFromBuckets
      ? ` · στη βάση: ${dbCreated.total} (showtimes ${dbCreated.showtimes} · παραστάσεις ${dbCreated.performances})`
      : '') +
    ` · υπήρχαν: ${report.alreadyExists}` +
    (report.createdCinemaVenues
      ? ` · νέα σινεμά: ${report.createdCinemaVenues}`
      : '') +
    (report.venueUpdatedStatuses?.updated
      ? ` · updated: ${report.venueUpdatedStatuses.complete} πλήρη · ${report.venueUpdatedStatuses.needs_manual} χειροκίνητα · ${report.venueUpdatedStatuses.no_new} χωρίς νέα`
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

module.exports = {
  syncShowtimesFromMore,
  parseMoreEventDatetime,
};
