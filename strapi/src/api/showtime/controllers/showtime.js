'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

function todayAthensKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

/** Επερχόμενες προβολές — optional horizon σε ημέρες (home-calendar). */
function upcomingShowtimeFilters(now = new Date(), horizonDays) {
  const todayKey = todayAthensKey(now);
  const upcoming = {
    $or: [
      { datetime: { $gte: now.toISOString() } },
      {
        schedule_kind: 'week_block',
        week_end: { $gte: todayKey },
      },
    ],
  };
  if (horizonDays == null || !Number.isFinite(horizonDays) || horizonDays <= 0) {
    return upcoming;
  }
  const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  return {
    $and: [
      upcoming,
      {
        $or: [
          { datetime: { $lte: horizon.toISOString() } },
          {
            schedule_kind: 'week_block',
            week_end: { $gte: todayKey },
          },
        ],
      },
    ],
  };
}

const SHOWTIME_POPULATE = {
  movie: {
    fields: ['id', 'slug', 'title', 'original_title', 'is_dubbed', 'language'],
    populate: { movie_genres: { fields: ['slug', 'label', 'sort_order'] }, poster: { fields: ['url', 'formats'] } },
  },
  venue: {
    fields: ['id', 'slug', 'name', 'summer_outdoor'],
  },
  hall: { fields: ['id', 'name'] },
};

const HOME_SHOWTIME_POPULATE = {
  movie: {
    // Χωρίς poster/formats — αλλιώς ~2MB JSON (ίδια αφίσα × χιλιάδες προβολές).
    // Αφίσες/είδη έρχονται από /movies στο frontend.
    fields: ['id', 'slug', 'title', 'original_title', 'duration', 'imdb_rating', 'is_dubbed'],
  },
  venue: {
    fields: ['id', 'slug', 'name', 'summer_outdoor'],
  },
  hall: { fields: ['id', 'name'] },
};

const SHOWTIME_FIELDS = [
  'datetime',
  'week_end',
  'schedule_kind',
  'available_seats',
  'price',
  'summer_screening',
];

function slimHomeCalendarRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (!row?.movie) return row;
    const { poster: _p, movie_genres: _g, critic_score: _c, language: _l, ...movie } = row.movie;
    return { ...row, movie };
  });
}

module.exports = createCoreController('api::showtime.showtime', ({ strapi }) => ({
  async venueCalendar(ctx) {
    const venueSlug = String(ctx.query?.venue ?? '').trim().toLowerCase();
    if (!venueSlug) return ctx.badRequest('Λείπει παράμετρος venue.');

    const now = new Date();
    const rows = await strapi.entityService.findMany('api::showtime.showtime', {
      filters: {
        venue: { slug: venueSlug },
        ...upcomingShowtimeFilters(now),
      },
      fields: SHOWTIME_FIELDS,
      populate: SHOWTIME_POPULATE,
      sort: ['datetime:asc'],
      publicationState: 'preview',
      limit: 5000,
    });

    ctx.body = { data: rows };
  },

  /** Ελαφρύ πρόγραμμα για αρχική / ταινίες — horizon 3 εβδομάδες by default. */
  async homeCalendar(ctx) {
    const now = new Date();
    const weeksRaw = Number(ctx.query?.weeks);
    const weeks = Number.isFinite(weeksRaw) && weeksRaw > 0 ? Math.min(weeksRaw, 12) : 3;
    const rows = await strapi.entityService.findMany('api::showtime.showtime', {
      filters: upcomingShowtimeFilters(now, weeks * 7),
      fields: SHOWTIME_FIELDS,
      populate: HOME_SHOWTIME_POPULATE,
      sort: ['datetime:asc'],
      publicationState: 'preview',
      limit: 5000,
    });

    ctx.body = { data: slimHomeCalendarRows(rows) };
  },
}));
