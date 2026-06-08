'use strict';

const { fetchMoreEventsByGroupCode } = require('./moreApi');
const { collectEventGroupCodes } = require('./moreEventGroupCodes');

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

/**
 * Συγχρονισμός προβολών: όλοι οι κωδικοί ταινίας (event_group_code + more_event_groups) → More API → venue.venue_id.
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
  const movies = await loadMoviesWithCodes(
    strapi,
    options.movieId != null ? Number(options.movieId) : undefined,
  );

  const report = {
    ok: true,
    at: new Date().toISOString(),
    horizonDays,
    venuesWithMoreId: venueByMoreId.size,
    moviesScanned: movies.length,
    created: 0,
    alreadyExists: 0,
    skippedPast: 0,
    skippedHorizon: 0,
    skippedNoVenue: 0,
    skippedInvalidDate: 0,
    errors: [],
    byMovie: [],
  };

  if (!venueByMoreId.size) {
    report.ok = false;
    report.errors.push('Δεν υπάρχουν σινεμά με συμπληρωμένο venue_id (More venueId).');
    report.durationMs = Date.now() - started;
    return report;
  }

  if (!movies.length) {
    report.errors.push('Δεν υπάρχουν ταινίες με per-movie event_group_code (κύριος ή more_event_groups).');
    report.durationMs = Date.now() - started;
    return report;
  }

  const totalFetches = movies.reduce(
    (sum, movie) => sum + collectEventGroupCodes(movie).length,
    0,
  );
  let fetchIndex = 0;

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
        const events = await fetchMoreEventsByGroupCode(code);

        for (const event of events) {
          const moreVenueId = String(event.venueId ?? '').trim();
          const venue = venueByMoreId.get(moreVenueId);
          if (!venue) {
            report.skippedNoVenue += 1;
            movieStats.skipped += 1;
            continue;
          }

          const datetime = parseMoreEventDatetime(event.eventDate);
          if (!datetime) {
            report.skippedInvalidDate += 1;
            movieStats.skipped += 1;
            continue;
          }

          if (datetime < now) {
            report.skippedPast += 1;
            movieStats.skipped += 1;
            continue;
          }

          if (datetime > horizonEnd) {
            report.skippedHorizon += 1;
            movieStats.skipped += 1;
            continue;
          }

          const exists = await showtimeExistsAt(strapi, {
            movieId: movie.id,
            venueId: venue.id,
            datetime,
          });

          if (exists) {
            report.alreadyExists += 1;
            movieStats.alreadyExists += 1;
            continue;
          }

          await strapi.entityService.create('api::showtime.showtime', {
            data: {
              schedule_kind: 'exact',
              datetime: datetime.toISOString(),
              movie: movie.id,
              venue: venue.id,
              summer_screening: venue.summer_outdoor === true,
            },
          });

          report.created += 1;
          movieStats.created += 1;
        }
      } catch (e) {
        const msg = e?.message || String(e);
        report.errors.push({ movieId: movie.id, title: movie.title, code, error: msg });
        strapi.log.warn(`[more-showtime-sync] movie ${movie.id} (${code}): ${msg}`);
      }

      fetchIndex += 1;
      if (fetchIndex < totalFetches && MOVIE_FETCH_DELAY_MS > 0) {
        await sleep(MOVIE_FETCH_DELAY_MS);
      }
    }

    if (movieStats.created > 0 || movieStats.alreadyExists > 0) {
      report.byMovie.push(movieStats);
    }
  }

  report.durationMs = Date.now() - started;
  report.message = `Νέες προβολές: ${report.created} · υπήρχαν ήδη: ${report.alreadyExists} · χωρίς venue_id στο CMS: ${report.skippedNoVenue}`;

  strapi.log.info(
    `[more-showtime-sync] movies=${report.moviesScanned} created=${report.created} exists=${report.alreadyExists} noVenue=${report.skippedNoVenue} (${report.durationMs}ms)`,
  );

  return report;
}

module.exports = {
  syncShowtimesFromMore,
  parseMoreEventDatetime,
  DEFAULT_HORIZON_DAYS,
};
