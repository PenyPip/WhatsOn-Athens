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

function athensDateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function endAthensKeyAfterWeeks(now = new Date(), weeks = 3) {
  const startKey = todayAthensKey(now);
  const startDate = athensDateFromKey(startKey);
  const days = Math.max(1, Number.isFinite(weeks) ? weeks * 7 : 21);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + days);
  const y = endDate.getFullYear();
  const m = String(endDate.getMonth() + 1).padStart(2, '0');
  const d = String(endDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseWeeks(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 3;
  return Math.min(8, Math.max(1, Math.floor(n)));
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
];

module.exports = createCoreController('api::theater-performance.theater-performance', ({ strapi }) => ({
  async venueCalendar(ctx) {
    const venueSlug = String(ctx.query?.venue ?? '').trim().toLowerCase();
    if (!venueSlug) return ctx.badRequest('Λείπει παράμετρος venue.');

    const now = new Date();
    const weeks = parseWeeks(ctx.query?.weeks);
    const todayKey = todayAthensKey(now);
    const endKey = endAthensKeyAfterWeeks(now, weeks);
    const endIso = new Date(`${endKey}T23:59:59.999+03:00`).toISOString();
    const rows = await strapi.entityService.findMany('api::theater-performance.theater-performance', {
      filters: {
        venue: { slug: venueSlug },
        $or: [
          { datetime: { $gte: now.toISOString(), $lte: endIso } },
          {
            schedule_kind: 'week_block',
            datetime: { $lte: endIso },
            week_end: { $gte: todayKey },
          },
        ],
      },
      fields: PERFORMANCE_FIELDS,
      populate: PERFORMANCE_POPULATE,
      sort: ['datetime:asc'],
      publicationState: 'preview',
      limit: 2000,
    });

    ctx.body = { data: rows };
  },

  async homeCalendar(ctx) {
    const now = new Date();
    const weeks = parseWeeks(ctx.query?.weeks ?? 5);
    const todayKey = todayAthensKey(now);
    const endKey = endAthensKeyAfterWeeks(now, weeks);
    const endIso = new Date(`${endKey}T23:59:59.999+03:00`).toISOString();
    const rows = await strapi.entityService.findMany('api::theater-performance.theater-performance', {
      filters: {
        $or: [
          { datetime: { $gte: now.toISOString(), $lte: endIso } },
          {
            schedule_kind: 'week_block',
            datetime: { $lte: endIso },
            week_end: { $gte: todayKey },
          },
        ],
      },
      fields: PERFORMANCE_FIELDS,
      populate: PERFORMANCE_POPULATE,
      sort: ['datetime:asc'],
      publicationState: 'preview',
      limit: 2500,
    });

    ctx.body = { data: rows };
  },
}));
