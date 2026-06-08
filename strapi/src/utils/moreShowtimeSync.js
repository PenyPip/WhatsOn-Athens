'use strict';

const { fetchMoreEventsByGroupCode } = require('./moreApi');
const { collectEventGroupCodes, collectVenueBundleCodes } = require('./moreEventGroupCodes');

const DEFAULT_HORIZON_DAYS = Number(process.env.MORE_SHOWTIME_SYNC_HORIZON_DAYS || 56);
const MOVIE_FETCH_DELAY_MS = Number(process.env.MORE_SHOWTIME_SYNC_DELAY_MS || 120);

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

async function loadVenueByMoreId(strapi) {
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    filters: {
      type: 'cinema',
      venue_id: { $notNull: true },
    },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor'],
    publicationState: 'preview',
    pagination: { pageSize: 300 },
  });
  const list = Array.isArray(rows) ? rows : [];
  const map = new Map();
  for (const venue of list) {
    const key = String(venue.venue_id || '').trim();
    if (key) map.set(key, venue);
  }
  return map;
}

async function loadVenuesWithBundleCodes(strapi) {
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    filters: { type: 'cinema' },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'event_group_code', 'more_link'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { pageSize: 300 },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((venue) => ({
      ...venue,
      bundleCodes: collectVenueBundleCodes(venue),
    }))
    .filter((venue) => venue.bundleCodes.length > 0);
}

async function loadMoviesWithCodes(strapi, movieIdFilter) {
  const filters = {};
  if (movieIdFilter != null) {
    filters.id = movieIdFilter;
  }
  const rows = await strapi.entityService.findMany('api::movie.movie', {
    filters,
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { pageSize: 500 },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((m) => collectEventGroupCodes(m).length > 0);
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
      const events = await fetchMoreEventsByGroupCode(key);
      cache.set(key, events);
      fetchIndex += 1;
      if (fetchIndex < totalFetches && fetchDelayMs > 0) {
        await sleep(fetchDelayMs);
      }
      return events;
    },
  };
}

async function buildEventIdIndex(movies, eventsCache) {
  const index = new Map();

  for (const movie of movies) {
    for (const code of collectEventGroupCodes(movie)) {
      const events = await eventsCache.get(code);
      for (const event of events) {
        const eventId = String(event.eventId ?? '').trim();
        if (!eventId || index.has(eventId)) continue;
        index.set(eventId, {
          movieId: movie.id,
          movieTitle: movie.title,
        });
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
  horizonEnd,
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

  if (datetime > horizonEnd) {
    report.skippedHorizon += 1;
    if (statsTarget) statsTarget.skipped += 1;
    return 'horizon';
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

/**
 * Συγχρονισμός προβολών More:
 * 1) ταινία codes + venue.venue_id
 * 2) venue bundle codes + eventId index από ταινίες (χωρίς venue_id)
 *
 * @param {object} strapi
 * @param {{ horizonDays?: number, movieId?: number }} options
 */
async function syncShowtimesFromMore(strapi, options = {}) {
  const started = Date.now();
  const horizonDays = options.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  const venueByMoreId = await loadVenueByMoreId(strapi);
  const venuesWithBundle = await loadVenuesWithBundleCodes(strapi);
  const movies = await loadMoviesWithCodes(
    strapi,
    options.movieId != null ? Number(options.movieId) : undefined,
  );

  const report = {
    ok: true,
    at: new Date().toISOString(),
    horizonDays,
    venuesWithMoreId: venueByMoreId.size,
    venuesWithBundleCode: venuesWithBundle.length,
    moviesScanned: movies.length,
    created: 0,
    createdFromMovies: 0,
    createdFromVenues: 0,
    alreadyExists: 0,
    skippedPast: 0,
    skippedHorizon: 0,
    skippedNoVenue: 0,
    skippedUnknownEventId: 0,
    skippedInvalidDate: 0,
    errors: [],
    byMovie: [],
    byVenue: [],
  };

  if (!movies.length) {
    report.ok = false;
    report.errors.push(
      'Δεν υπάρχουν ταινίες με per-movie event_group_code (κύριος ή More event groups).',
    );
    report.message = report.errors[0];
    report.durationMs = Date.now() - started;
    return report;
  }

  if (!venueByMoreId.size && !venuesWithBundle.length) {
    report.ok = false;
    const msg =
      'Δεν υπάρχουν σινεμά με venue_id ή venue bundle event_group_code (π.χ. evg_aiglecinema_…).';
    report.errors.push(msg);
    report.message = msg;
    report.durationMs = Date.now() - started;
    return report;
  }

  const movieCodeCount = movies.reduce(
    (sum, movie) => sum + collectEventGroupCodes(movie).length,
    0,
  );
  const venueCodeCount = venuesWithBundle.reduce(
    (sum, venue) => sum + venue.bundleCodes.length,
    0,
  );
  const eventsCache = createEventsCache(MOVIE_FETCH_DELAY_MS);
  eventsCache.setTotalFetches(movieCodeCount + venueCodeCount);

  const eventIdIndex = await buildEventIdIndex(movies, eventsCache);

  for (let i = 0; i < movies.length; i += 1) {
    const movie = movies[i];
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
          const moreVenueId = String(event.venueId ?? '').trim();
          const venue = venueByMoreId.get(moreVenueId);
          if (!venue) {
            report.skippedNoVenue += 1;
            movieStats.skipped += 1;
            continue;
          }

          const result = await upsertShowtimeFromEvent(strapi, report, {
            event,
            movieId: movie.id,
            venue,
            now,
            horizonEnd,
            statsTarget: movieStats,
          });
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

          const result = await upsertShowtimeFromEvent(strapi, report, {
            event,
            movieId: mapped.movieId,
            venue,
            now,
            horizonEnd,
            statsTarget: venueStats,
          });
          if (result === 'created') report.createdFromVenues += 1;
        }
      } catch (e) {
        const msg = e?.message || String(e);
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

  report.durationMs = Date.now() - started;
  report.message =
    `Νέες προβολές: ${report.created} (ταινίες: ${report.createdFromMovies} · χώροι: ${report.createdFromVenues})` +
    ` · υπήρχαν: ${report.alreadyExists}` +
    ` · χωρίς venue_id: ${report.skippedNoVenue}` +
    ` · άγνωστο eventId: ${report.skippedUnknownEventId}`;

  strapi.log.info(
    `[more-showtime-sync] movies=${report.moviesScanned} venues=${report.venuesWithBundleCode} created=${report.created} exists=${report.alreadyExists} unknownEventId=${report.skippedUnknownEventId} (${report.durationMs}ms)`,
  );

  return report;
}

module.exports = {
  syncShowtimesFromMore,
  parseMoreEventDatetime,
  DEFAULT_HORIZON_DAYS,
};
