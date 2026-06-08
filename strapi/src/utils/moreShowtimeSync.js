'use strict';

const { fetchMoreEventsByGroupCode } = require('./moreApi');
const {
  collectEventGroupCodes,
  collectVenueBundleCodes,
  collectTheaterVenueBundleCodes,
} = require('./moreEventGroupCodes');

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

async function loadVenueByMoreId(strapi, venueType) {
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    filters: {
      type: venueType,
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

async function loadVenuesWithBundleCodes(strapi, venueType, collectBundleFn) {
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    filters: { type: venueType },
    fields: ['id', 'name', 'slug', 'venue_id', 'summer_outdoor', 'event_group_code', 'more_link'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { pageSize: 300 },
  });
  const list = Array.isArray(rows) ? rows : [];
  return list
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

async function loadTheaterShowsWithCodes(strapi, theaterShowIdFilter) {
  const filters = {};
  if (theaterShowIdFilter != null) {
    filters.id = theaterShowIdFilter;
  }
  const rows = await strapi.entityService.findMany('api::theater-show.theater-show', {
    filters,
    fields: ['id', 'title', 'slug', 'event_group_code'],
    populate: { more_event_groups: true },
    publicationState: 'preview',
    pagination: { pageSize: 500 },
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
    publicationState: 'preview',
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

async function upsertPerformanceFromEvent(strapi, report, {
  event,
  theaterShowId,
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
    skippedHorizon: 0,
    skippedNoVenue: 0,
    skippedUnknownEventId: 0,
    skippedInvalidDate: 0,
    errors: [],
  };
}

async function syncMovieShowtimesFromMore(strapi, {
  movies,
  venueByMoreId,
  venuesWithBundle,
  eventsCache,
  now,
  horizonEnd,
}) {
  const report = {
    ...emptySyncCounters(),
    moviesScanned: movies.length,
    venuesWithMoreId: venueByMoreId.size,
    venuesWithBundleCode: venuesWithBundle.length,
    createdFromMovies: 0,
    createdFromVenues: 0,
    byMovie: [],
    byVenue: [],
  };

  if (!movies.length) {
    report.note = 'Δεν υπάρχουν ταινίες με per-movie event_group_code.';
    return report;
  }

  if (!venueByMoreId.size && !venuesWithBundle.length) {
    report.note =
      'Δεν υπάρχουν σινεμά με venue_id ή venue bundle event_group_code (π.χ. evg_aiglecinema_…).';
    return report;
  }

  const eventIdIndex = await buildEventIdIndex(movies, eventsCache, (movie) => ({
    movieId: movie.id,
    movieTitle: movie.title,
  }));

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

  return report;
}

async function syncTheaterPerformancesFromMore(strapi, {
  theaterShows,
  venueByMoreId,
  venuesWithBundle,
  eventsCache,
  now,
  horizonEnd,
}) {
  const report = {
    ...emptySyncCounters(),
    theaterShowsScanned: theaterShows.length,
    theaterVenuesWithMoreId: venueByMoreId.size,
    theaterVenuesWithBundleCode: venuesWithBundle.length,
    createdFromTheaterShows: 0,
    createdFromTheaterVenues: 0,
    byTheaterShow: [],
    byTheaterVenue: [],
  };

  if (!theaterShows.length) {
    report.note = 'Δεν υπάρχουν παραστάσεις θεάτρου με event_group_code.';
    return report;
  }

  if (!venueByMoreId.size && !venuesWithBundle.length) {
    report.note =
      'Δεν υπάρχουν θεατρικοί χώροι με venue_id ή venue bundle event_group_code (evg_…).';
    return report;
  }

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
    };

    for (const code of codes) {
      try {
        const events = await eventsCache.get(code);

        for (const event of events) {
          const moreVenueId = String(event.venueId ?? '').trim();
          const venue = venueByMoreId.get(moreVenueId);
          if (!venue) {
            report.skippedNoVenue += 1;
            showStats.skipped += 1;
            continue;
          }

          const result = await upsertPerformanceFromEvent(strapi, report, {
            event,
            theaterShowId: show.id,
            venue,
            now,
            horizonEnd,
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

    if (showStats.created > 0 || showStats.alreadyExists > 0) {
      report.byTheaterShow.push(showStats);
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
            horizonEnd,
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
 * @param {{ horizonDays?: number, movieId?: number, theaterShowId?: number }} options
 */
async function syncShowtimesFromMore(strapi, options = {}) {
  const started = Date.now();
  const horizonDays = options.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  const cinemaVenueByMoreId = await loadVenueByMoreId(strapi, 'cinema');
  const cinemaVenuesWithBundle = await loadVenuesWithBundleCodes(
    strapi,
    'cinema',
    collectVenueBundleCodes,
  );
  const theaterVenueByMoreId = await loadVenueByMoreId(strapi, 'theater');
  const theaterVenuesWithBundle = await loadVenuesWithBundleCodes(
    strapi,
    'theater',
    collectTheaterVenueBundleCodes,
  );

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
    venueByMoreId: cinemaVenueByMoreId,
    venuesWithBundle: cinemaVenuesWithBundle,
    eventsCache,
    now,
    horizonEnd,
  });

  const theaterReport = await syncTheaterPerformancesFromMore(strapi, {
    theaterShows,
    venueByMoreId: theaterVenueByMoreId,
    venuesWithBundle: theaterVenuesWithBundle,
    eventsCache,
    now,
    horizonEnd,
  });

  const created =
    movieReport.createdFromMovies +
    movieReport.createdFromVenues +
    theaterReport.createdFromTheaterShows +
    theaterReport.createdFromTheaterVenues;

  const report = {
    ok: movieReport.errors.length === 0 && theaterReport.errors.length === 0,
    at: new Date().toISOString(),
    horizonDays,
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
    alreadyExists: movieReport.alreadyExists + theaterReport.alreadyExists,
    updatedSoldOut: theaterReport.updatedSoldOut,
    skippedPast: movieReport.skippedPast + theaterReport.skippedPast,
    skippedHorizon: movieReport.skippedHorizon + theaterReport.skippedHorizon,
    skippedNoVenue: movieReport.skippedNoVenue + theaterReport.skippedNoVenue,
    skippedUnknownEventId:
      movieReport.skippedUnknownEventId + theaterReport.skippedUnknownEventId,
    skippedInvalidDate: movieReport.skippedInvalidDate + theaterReport.skippedInvalidDate,
    errors: [...movieReport.errors, ...theaterReport.errors],
    byMovie: movieReport.byMovie,
    byVenue: movieReport.byVenue,
    byTheaterShow: theaterReport.byTheaterShow,
    byTheaterVenue: theaterReport.byTheaterVenue,
    movieNote: movieReport.note,
    theaterNote: theaterReport.note,
    durationMs: Date.now() - started,
  };

  report.message =
    `Νέες: ${created} (ταινίες: ${report.createdFromMovies} · σινεμά bundle: ${report.createdFromVenues}` +
    ` · θέατρο: ${report.createdFromTheaterShows} · θέατρο bundle: ${report.createdFromTheaterVenues})` +
    ` · υπήρχαν: ${report.alreadyExists}` +
    (report.updatedSoldOut ? ` · sold out ενημ.: ${report.updatedSoldOut}` : '') +
    ` · χωρίς venue_id: ${report.skippedNoVenue}` +
    ` · άγνωστο eventId: ${report.skippedUnknownEventId}`;

  strapi.log.info(
    `[more-showtime-sync] movies=${report.moviesScanned} theater=${report.theaterShowsScanned} created=${report.created} exists=${report.alreadyExists} unknownEventId=${report.skippedUnknownEventId} (${report.durationMs}ms)`,
  );

  return report;
}

module.exports = {
  syncShowtimesFromMore,
  parseMoreEventDatetime,
  DEFAULT_HORIZON_DAYS,
};
