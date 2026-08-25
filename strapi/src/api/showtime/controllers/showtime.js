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
  // Με horizon: week_block αν επικαλύπτει το παράθυρο (όχι μόνο αν τελειώνει μέσα σε αυτό).
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
            datetime: { $lte: horizon.toISOString() },
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
    fields: ['id', 'slug', 'title'],
    populate: { poster: { fields: ['url', 'formats'] } },
  },
  venue: {
    fields: ['id', 'slug', 'name', 'summer_outdoor'],
  },
};

const HOME_SHOWTIME_FIELDS = [
  'datetime',
  'week_end',
  'schedule_kind',
  'summer_screening',
];

const SHOWTIME_FIELDS = [
  'datetime',
  'week_end',
  'schedule_kind',
  'available_seats',
  'price',
  'summer_screening',
];

/**
 * Flat-ish slim: κόβει hall/price/seats και περιττά nested keys.
 * Στόχος: <~400KB JSON αντί ~1MB (TBT από JSON.parse + mapShowtime).
 */
function slimHomeCalendarRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    const m = row.movie && typeof row.movie === 'object' ? row.movie : null;
    const v = row.venue && typeof row.venue === 'object' ? row.venue : null;
    const out = {
      id: row.id,
      datetime: row.datetime,
    };
    if (row.schedule_kind && row.schedule_kind !== 'exact') {
      out.schedule_kind = row.schedule_kind;
    }
    if (row.week_end) out.week_end = row.week_end;
    if (row.summer_screening) out.summer_screening = true;
    if (m) {
      const movie = {
        id: m.id,
        slug: m.slug,
        title: m.title,
      };
      const poster = m.poster && typeof m.poster === 'object' ? m.poster : null;
      if (poster) {
        const formats = poster.formats && typeof poster.formats === 'object' ? poster.formats : null;
        const small =
          (formats?.small && formats.small.url) ||
          (formats?.thumbnail && formats.thumbnail.url) ||
          poster.url;
        if (typeof small === 'string' && small.trim()) {
          movie.poster = { url: small.trim() };
        }
      }
      out.movie = movie;
    }
    if (v) {
      out.venue = { id: v.id, slug: v.slug };
      if (typeof v.name === 'string' && v.name.trim()) out.venue.name = v.name.trim();
      if (v.summer_outdoor) out.venue.summer_outdoor = true;
    }
    return out;
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

  /** Ελαφρύ πρόγραμμα για αρχική / ταινίες — όλες οι επερχόμενες (χωρίς κόψιμο εβδομάδων). */
  async homeCalendar(ctx) {
    const now = new Date();
    const weeksRaw = Number(ctx.query?.weeks);
    /** Optional: ?weeks=N για προσωρινό horizon· χωρίς / ≤0 → όλες οι επερχόμενες. */
    const weeks =
      Number.isFinite(weeksRaw) && weeksRaw > 0 ? Math.min(weeksRaw, 52) : null;
    const horizonDays = weeks != null ? weeks * 7 : null;
    const rows = await strapi.entityService.findMany('api::showtime.showtime', {
      filters: upcomingShowtimeFilters(now, horizonDays),
      fields: HOME_SHOWTIME_FIELDS,
      populate: HOME_SHOWTIME_POPULATE,
      sort: ['datetime:asc'],
      publicationState: 'preview',
      limit: 5000,
    });

    ctx.body = { data: slimHomeCalendarRows(rows) };
  },
}));
