'use strict';

const { fetchMoreEventsByGroupCode } = require('./moreApi');
const {
  collectEventGroupCodes,
  collectVenueBundleCodes,
  collectTheaterVenueBundleCodes,
} = require('./moreEventGroupCodes');
const {
  createVenueSyncStatsTracker,
  applyCinemaVenueUpdatedStatuses,
  migrateVenueUpdatedBooleanToEnum,
} = require('../api/venue/services/venue-updated-status');

const MOVIE_FETCH_DELAY_MS = Number(process.env.MORE_SHOWTIME_SYNC_DELAY_MS || 120);

/** Κατά sync: δημιουργία χώρου από More αν λείπει (venueId / venueName). */
const AUTO_CREATE_THEATER_VENUES = process.env.MORE_THEATER_SYNC_AUTO_CREATE_VENUES !== 'false';
const AUTO_CREATE_CINEMA_VENUES = process.env.MORE_CINEMA_SYNC_AUTO_CREATE_VENUES !== 'false';

const VENUE_AUTO_CREATE = {
  theater: {
    isEnabled: () => AUTO_CREATE_THEATER_VENUES,
    venueType: 'theater',
    findTypeFilter: { $ne: 'cinema' },
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
    findTypeFilter: 'cinema',
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

function createEventsCache(fetchDelayMs) {
  const cache = new Map();
  let fetchIndex = 0;
  let totalFetches = 0;

  return {
    setTotalFetches(n) {
      totalFetches = n;
    },
    async get(code) {
      const key = String(code || '').trim();
      if (!key) return [];
      if (cache.has(key)) return cache.get(key);
      let events = [];
      try {
        events = await fetchMoreEventsByGroupCode(key);
      } catch (e) {
        const msg = e?.message || String(e);
        console.warn(`[more-showtime-sync] getevents failed (${key}): ${msg}`);
        events = [];
      }
      cache.set(key, events);
      fetchIndex += 1;
      if (fetchIndex < totalFetches && fetchDelayMs > 0) {
        await sleep(fetchDelayMs);
      }
      return events;
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

function normalizeMoreVenueId(raw) {
  return String(raw ?? '').trim();
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
    publishedAt: new Date().toISOString(),
    info: config.info,
  };
  if (moreVenueId) data.venue_id = moreVenueId;
  if (config.venueType === 'cinema' && /θεριν|summer/i.test(venueName)) {
    data.summer_outdoor = true;
  }

  const mapUrl = String(event?.venueMapUrl || event?.venueMapURL || '').trim();
  if (mapUrl && /google\.com\/maps/i.test(mapUrl)) {
    data.google_maps_url = mapUrl;
  }

  const lat = event?.venueLatitude ?? event?.venueLat;
  const lng = event?.venueLongitude ?? event?.venueLng;
  if (!data.google_maps_url && lat != null && lng != null) {
    const la = Number(String(lat).replace(',', '.'));
    const lo = Number(String(lng).replace(',', '.'));
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      data.google_maps_url = `https://www.google.com/maps?q=${la},${lo}`;
    }
  }

  return { data, moreVenueId, venueName };
}

async function findVenueByMoreId(strapi, moreVenueId, config) {
  if (!moreVenueId) return null;
  const typeFilter =
    typeof config.findTypeFilter === 'string'
      ? config.findTypeFilter
      : { $ne: 'cinema' };
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    filters: {
      venue_id: moreVenueId,
      type: typeFilter,
    },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'type'],
    publicationState: 'preview',
    limit: 1,
  });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function createVenueFromMore(strapi, event, report, config) {
  const { data, moreVenueId, venueName } = buildVenueDataFromMoreEvent(event, config);
  if (!venueName) return null;

  if (!Array.isArray(report[config.listKey])) report[config.listKey] = [];
  if (typeof report[config.countKey] !== 'number') report[config.countKey] = 0;

  try {
    const created = await strapi.entityService.create('api::venue.venue', { data });
    report[config.countKey] += 1;
    report[config.listKey].push({
      id: created.id,
      name: created.name,
      slug: created.slug,
      moreVenueId: moreVenueId || null,
    });
    strapi.log.info(
      `[${config.logTag}] created venue ${created.id} ${created.name} (moreVenueId=${moreVenueId || '—'})`,
    );
    return created;
  } catch (e) {
    const msg = e?.message || String(e);
    if (moreVenueId && /unique|slug|already exists/i.test(msg)) {
      try {
        const slugSuffix = String(moreVenueId).replace(/\W+/g, '-');
        const created = await strapi.entityService.create('api::venue.venue', {
          data: { ...data, slug: `${config.slugPrefix}-${slugSuffix}` },
        });
        report[config.countKey] += 1;
        report[config.listKey].push({
          id: created.id,
          name: created.name,
          slug: created.slug,
          moreVenueId,
        });
        strapi.log.info(
          `[${config.logTag}] created venue ${created.id} ${created.name} (slug fallback, moreVenueId=${moreVenueId})`,
        );
        return created;
      } catch (e2) {
        report.errors.push({
          action: 'create_venue',
          venueType: config.venueType,
          moreVenueId,
          name: venueName,
          error: e2?.message || String(e2),
        });
        return null;
      }
    }
    report.errors.push({
      action: 'create_venue',
      venueType: config.venueType,
      moreVenueId,
      name: venueName,
      error: msg,
    });
    return null;
  }
}

/**
 * Επιστρέφει venue από lookup ή το δημιουργεί από More event.
 * @param {Map<string, Promise<object|null>>} pendingVenueCreates
 */
async function ensureVenueFromMoreEvent(strapi, lookup, event, report, pendingVenueCreates, config) {
  const existing = resolveVenueFromMoreEvent(lookup, event);
  if (existing) return existing;

  if (!config.isEnabled()) return null;

  const moreVenueId = normalizeMoreVenueId(event?.venueId);
  const nameKey = normalizeVenueName(event?.venueName);
  const pendingKey = `${config.venueType}:${moreVenueId || (nameKey ? `name:${nameKey}` : '')}`;
  if (pendingKey === `${config.venueType}:`) return null;

  if (pendingVenueCreates.has(pendingKey)) {
    return pendingVenueCreates.get(pendingKey);
  }

  const promise = (async () => {
    if (moreVenueId) {
      const fromDb = await findVenueByMoreId(strapi, moreVenueId, config);
      if (fromDb) {
        registerVenueInLookup(lookup, fromDb);
        return fromDb;
      }
    }

    const created = await createVenueFromMore(strapi, event, report, config);
    if (created) {
      registerVenueInLookup(lookup, created);
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

function ensureTheaterVenueFromMoreEvent(strapi, lookup, event, report, pendingVenueCreates) {
  return ensureVenueFromMoreEvent(strapi, lookup, event, report, pendingVenueCreates, VENUE_AUTO_CREATE.theater);
}

function ensureCinemaVenueFromMoreEvent(strapi, lookup, event, report, pendingVenueCreates) {
  return ensureVenueFromMoreEvent(strapi, lookup, event, report, pendingVenueCreates, VENUE_AUTO_CREATE.cinema);
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
  const filters = {};
  if (movieIdFilter != null) {
    filters.id = movieIdFilter;
  }
  const rows = await findAllEntities(strapi, 'api::movie.movie', {
    filters,
    fields: ['id', 'title', 'slug', 'event_group_code'],
    publicationState: 'preview',
    pageSize: 200,
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((m) => collectEventGroupCodes(m).length > 0);
}

async function loadTheaterShowsWithCodes(strapi, theaterShowIdFilter) {
  const filters = {};
  if (theaterShowIdFilter != null) {
    filters.id = theaterShowIdFilter;
  }
  const rows = await findAllEntities(strapi, 'api::theater-show.theater-show', {
    filters,
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pageSize: 200,
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((show) => collectEventGroupCodes(show).length > 0);
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

  for (const item of items) {
    for (const code of collectEventGroupCodes(item)) {
      const events = await eventsCache.get(code);
      for (const event of events) {
        const eventId = String(event.eventId ?? '').trim();
        if (!eventId || index.has(eventId)) continue;
        index.set(eventId, mapItem(item));
      }
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
    errors: [],
  };
}

async function syncMovieShowtimesFromMore(strapi, {
  movies,
  venueLookup,
  venuesWithBundle,
  eventsCache,
  now,
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
  };

  const pendingVenueCreates = new Map();
  const venueSyncTracker = createVenueSyncStatsTracker();

  if (!movies.length && !venuesWithBundle.length) {
    report.note = 'Δεν υπάρχουν ταινίες με per-movie event_group_code ούτε σινεμά με venue bundle.';
    return report;
  }

  if (!movies.length) {
    report.note =
      'Δεν υπάρχουν ταινίες με per-movie event_group_code — συγχρονισμός μόνο από venue bundle σινεμά.';
  }

  const eventIdIndex = movies.length
    ? await buildEventIdIndex(movies, eventsCache, (movie) => ({
        movieId: movie.id,
        movieTitle: movie.title,
      }))
    : new Map();

  for (const movie of movies) {
    const codes = collectEventGroupCodes(movie);
    const movieStats = {
      movieId: movie.id,
      title: movie.title,
      eventGroupCodes: codes,
      eventGroupCode: codes[0] || null,
      created: 0,
      alreadyExists: 0,
      skipped: 0,
    };

    for (const code of codes) {
      try {
        const events = await eventsCache.get(code);

        for (const event of events) {
          let venue = resolveVenueFromMoreEvent(venueLookup, event);
          if (!venue) {
            venue = await ensureCinemaVenueFromMoreEvent(
              strapi,
              venueLookup,
              event,
              report,
              pendingVenueCreates,
            );
          }
          if (!venue) {
            report.skippedNoVenue += 1;
            movieStats.skipped += 1;
            continue;
          }

          venueSyncTracker.touch(venue.id);
          const result = await upsertShowtimeFromEvent(strapi, report, {
            event,
            movieId: movie.id,
            venue,
            now,
            statsTarget: movieStats,
          });
          venueSyncTracker.recordUpsertResult(venue.id, result);
          if (result === 'created') report.createdFromMovies += 1;
        }
      } catch (e) {
        const msg = e?.message || String(e);
        report.errors.push({ movieId: movie.id, title: movie.title, code, error: msg });
        strapi.log.warn(`[more-showtime-sync] movie ${movie.id} (${code}): ${msg}`);
      }
    }

    if (movieStats.created > 0 || movieStats.alreadyExists > 0) {
      report.byMovie.push(movieStats);
    }
  }

  for (const venue of venuesWithBundle) {
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
          const mapped = eventIdIndex.get(eventId);
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
          });
          venueSyncTracker.recordUpsertResult(venue.id, result);
          if (result === 'created') report.createdFromVenues += 1;
        }
      } catch (e) {
        const msg = e?.message || String(e);
        venueStats.errors = (venueStats.errors || 0) + 1;
        venueSyncTracker.record(venue.id, { errors: 1 });
        report.errors.push({
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

  if (venueSyncTracker.entries().length > 0) {
    await migrateVenueUpdatedBooleanToEnum(strapi);
    report.venueUpdatedStatuses = await applyCinemaVenueUpdatedStatuses(strapi, venueSyncTracker, {
      autoCreatedVenueIds: (report.createdCinemaVenuesList || []).map((v) => v.id),
    });
  }

  return report;
}

async function syncTheaterPerformancesFromMore(strapi, {
  theaterShows,
  venueLookup,
  venuesWithBundle,
  eventsCache,
  now,
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

  if (!theaterShows.length) {
    report.note = 'Δεν υπάρχουν παραστάσεις θεάτρου με event_group_code.';
    return report;
  }

  const pendingVenueCreates = new Map();

  const eventIdIndex = await buildEventIdIndex(theaterShows, eventsCache, (show) => ({
    theaterShowId: show.id,
    theaterShowTitle: show.title,
  }));

  for (const show of theaterShows) {
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
          let venue = resolveVenueFromMoreEvent(venueLookup, event);
          if (!venue) {
            venue = await ensureTheaterVenueFromMoreEvent(
              strapi,
              venueLookup,
              event,
              report,
              pendingVenueCreates,
            );
          }
          if (!venue) {
            report.skippedNoVenue += 1;
            showStats.skipped += 1;
            const missingId = normalizeMoreVenueId(event?.venueId);
            if (missingId) showStats.missingVenueIds.add(missingId);
            continue;
          }

          const result = await upsertPerformanceFromEvent(strapi, report, {
            event,
            theaterShowId: show.id,
            venue,
            now,
            statsTarget: showStats,
          });
          if (result === 'created') report.createdFromTheaterShows += 1;
        }
      } catch (e) {
        const msg = e?.message || String(e);
        report.errors.push({ theaterShowId: show.id, title: show.title, code, error: msg });
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

  for (const venue of venuesWithBundle) {
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
          const mapped = eventIdIndex.get(eventId);
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
          });
          if (result === 'created') report.createdFromTheaterVenues += 1;
        }
      } catch (e) {
        const msg = e?.message || String(e);
        report.errors.push({
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
async function syncShowtimesFromMore(strapi, options = {}) {
  const started = Date.now();
  const now = new Date();

  const cinemaVenueLookup = await loadVenueByMoreId(strapi, 'cinema');
  const cinemaVenuesWithBundle = await loadVenuesWithBundleCodes(
    strapi,
    'cinema',
    collectVenueBundleCodes,
  );
  const theaterVenueLookup = await loadTheaterVenueLookup(strapi);
  const theaterVenuesWithBundle = await loadTheaterVenuesWithBundleCodes(strapi);

  const movies = await loadMoviesWithCodes(
    strapi,
    options.movieId != null ? Number(options.movieId) : undefined,
  );
  const theaterShows = await loadTheaterShowsWithCodes(
    strapi,
    options.theaterShowId != null ? Number(options.theaterShowId) : undefined,
  );

  const movieCodeCount = movies.reduce((sum, movie) => sum + collectEventGroupCodes(movie).length, 0);
  const theaterCodeCount = theaterShows.reduce(
    (sum, show) => sum + collectEventGroupCodes(show).length,
    0,
  );
  const cinemaVenueCodeCount = cinemaVenuesWithBundle.reduce(
    (sum, venue) => sum + venue.bundleCodes.length,
    0,
  );
  const theaterVenueCodeCount = theaterVenuesWithBundle.reduce(
    (sum, venue) => sum + venue.bundleCodes.length,
    0,
  );

  const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
  eventsCache.setTotalFetches(
    movieCodeCount + theaterCodeCount + cinemaVenueCodeCount + theaterVenueCodeCount,
  );

  const movieReport = await syncMovieShowtimesFromMore(strapi, {
    movies,
    venueLookup: cinemaVenueLookup,
    venuesWithBundle: cinemaVenuesWithBundle,
    eventsCache,
    now,
  });

  const theaterReport = await syncTheaterPerformancesFromMore(strapi, {
    theaterShows,
    venueLookup: theaterVenueLookup,
    venuesWithBundle: theaterVenuesWithBundle,
    eventsCache,
    now,
  });

  const created =
    movieReport.createdFromMovies +
    movieReport.createdFromVenues +
    theaterReport.createdFromTheaterShows +
    theaterReport.createdFromTheaterVenues;

  const report = {
    ok: true,
    at: new Date().toISOString(),
    moviesScanned: movieReport.moviesScanned,
    theaterShowsScanned: theaterReport.theaterShowsScanned,
    venuesWithMoreId: movieReport.venuesWithMoreId,
    venuesWithBundleCode: movieReport.venuesWithBundleCode,
    theaterVenuesWithMoreId: theaterReport.theaterVenuesWithMoreId,
    theaterVenuesWithBundleCode: theaterReport.theaterVenuesWithBundleCode,
    created,
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
    skippedInvalidDate: movieReport.skippedInvalidDate + theaterReport.skippedInvalidDate,
    errors: [...movieReport.errors, ...theaterReport.errors],
    byMovie: movieReport.byMovie,
    byVenue: movieReport.byVenue,
    byTheaterShow: theaterReport.byTheaterShow,
    byTheaterVenue: theaterReport.byTheaterVenue,
    missingVenueIds: theaterReport.missingVenueIds,
    movieNote: movieReport.note,
    theaterNote: theaterReport.note,
    durationMs: Date.now() - started,
  };

  report.message =
    `Νέες: ${created} (ταινίες: ${report.createdFromMovies} · σινεμά bundle: ${report.createdFromVenues}` +
    ` · θέατρο: ${report.createdFromTheaterShows} · θέατρο bundle: ${report.createdFromTheaterVenues})` +
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
    ` · άγνωστο eventId: ${report.skippedUnknownEventId}`;

  strapi.log.info(
    `[more-showtime-sync] movies=${report.moviesScanned} theater=${report.theaterShowsScanned} created=${report.created} exists=${report.alreadyExists} unknownEventId=${report.skippedUnknownEventId} (${report.durationMs}ms)`,
  );

  return report;
}

module.exports = {
  syncShowtimesFromMore,
  parseMoreEventDatetime,
};
