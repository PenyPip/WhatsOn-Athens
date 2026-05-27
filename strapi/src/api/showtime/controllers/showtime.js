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

module.exports = createCoreController('api::showtime.showtime', ({ strapi }) => ({
  async venueCalendar(ctx) {
    const venueSlug = String(ctx.query?.venue ?? '').trim().toLowerCase();
    if (!venueSlug) return ctx.badRequest('Λείπει παράμετρος venue.');

    const now = new Date();
    const weeks = parseWeeks(ctx.query?.weeks);
    const todayKey = todayAthensKey(now);
    const endKey = endAthensKeyAfterWeeks(now, weeks);
    const endIso = new Date(`${endKey}T23:59:59.999+03:00`).toISOString();
    const rows = await strapi.entityService.findMany('api::showtime.showtime', {
      filters: {
        venue: { slug: venueSlug },
        $or: [
          {
            datetime: { $gte: now.toISOString(), $lte: endIso },
          },
          {
            schedule_kind: 'week_block',
            datetime: { $lte: endIso },
            week_end: { $gte: todayKey },
          },
        ],
      },
      fields: ['datetime', 'week_end', 'schedule_kind', 'available_seats', 'price', 'summer_screening'],
      populate: {
        movie: {
          fields: ['id', 'slug', 'title', 'is_dubbed', 'language', 'genre_display'],
          populate: { movie_genres: { fields: ['slug', 'label', 'sort_order'] }, poster: { fields: ['url', 'formats'] } },
        },
        venue: {
          fields: ['id', 'slug', 'name', 'summer_outdoor'],
        },
        hall: { fields: ['id', 'name'] },
      },
      sort: ['datetime:asc'],
      publicationState: 'preview',
      limit: 2000,
    });

    ctx.body = { data: rows };
  },
}));
