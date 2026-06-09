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

/** Επερχόμενες προβολές — χωρίς ανώτατο όριο ημερομηνίας. */
function upcomingShowtimeFilters(now = new Date()) {
  const todayKey = todayAthensKey(now);
  return {
    $or: [
      { datetime: { $gte: now.toISOString() } },
      {
        schedule_kind: 'week_block',
        week_end: { $gte: todayKey },
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
    fields: ['id', 'slug', 'title', 'original_title', 'duration', 'imdb_rating', 'critic_score', 'is_dubbed', 'language'],
    populate: {
      movie_genres: { fields: ['slug', 'label', 'sort_order'] },
      poster: { fields: ['url', 'formats'] },
    },
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

  /** Ελαφρύ πρόγραμμα για αρχική / ταινίες — όλες οι επερχόμενες προβολές. */
  async homeCalendar(ctx) {
    const now = new Date();
    const rows = await strapi.entityService.findMany('api::showtime.showtime', {
      filters: upcomingShowtimeFilters(now),
      fields: SHOWTIME_FIELDS,
      populate: HOME_SHOWTIME_POPULATE,
      sort: ['datetime:asc'],
      publicationState: 'preview',
      limit: 5000,
    });

    ctx.body = { data: rows };
  },
}));
