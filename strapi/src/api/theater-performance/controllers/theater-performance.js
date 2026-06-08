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

/** Επερχόμενες εμφανίσεις — χωρίς ανώτατο όριο ημερομηνίας (σε αντίθεση με σινεμά). */
function upcomingPerformanceFilters(now = new Date()) {
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

const PERFORMANCE_POPULATE = {
  theater_show: {
    fields: ['id', 'slug', 'title', 'sold_out', 'ticket_price', 'ticket_price_from', 'ticket_price_to'],
    populate: { poster: { fields: ['url', 'formats'] } },
  },
  venue: {
    fields: ['id', 'slug', 'name', 'address', 'google_maps_url', 'more_link', 'type'],
  },
  hall: { fields: ['id', 'name'] },
};

const PERFORMANCE_FIELDS = [
  'datetime',
  'week_end',
  'schedule_kind',
  'available_seats',
  'price',
  'sold_out',
];

module.exports = createCoreController('api::theater-performance.theater-performance', ({ strapi }) => ({
  async venueCalendar(ctx) {
    const venueSlug = String(ctx.query?.venue ?? '').trim().toLowerCase();
    if (!venueSlug) return ctx.badRequest('Λείπει παράμετρος venue.');

    const now = new Date();
    const rows = await strapi.entityService.findMany('api::theater-performance.theater-performance', {
      filters: {
        venue: { slug: venueSlug },
        ...upcomingPerformanceFilters(now),
      },
      fields: PERFORMANCE_FIELDS,
      populate: PERFORMANCE_POPULATE,
      sort: ['datetime:asc'],
      limit: 5000,
    });

    ctx.body = { data: rows };
  },

  async homeCalendar(ctx) {
    const now = new Date();
    const rows = await strapi.entityService.findMany('api::theater-performance.theater-performance', {
      filters: upcomingPerformanceFilters(now),
      fields: PERFORMANCE_FIELDS,
      populate: PERFORMANCE_POPULATE,
      sort: ['datetime:asc'],
      limit: 5000,
    });

    ctx.body = { data: rows };
  },
}));
