'use strict';

const MS_DAY = 24 * 60 * 60 * 1000;

function toUtcDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function datetimeOnDay(dayUtc, template) {
  const t = template instanceof Date ? template : new Date(template);
  return new Date(
    dayUtc +
      (t.getUTCHours() * 3600000 +
        t.getUTCMinutes() * 60000 +
        t.getUTCSeconds() * 1000 +
        t.getUTCMilliseconds()),
  );
}

function relationId(rel) {
  if (rel == null) return null;
  if (typeof rel === 'number' && Number.isFinite(rel)) return rel;
  if (typeof rel === 'string' && /^\d+$/.test(rel)) return Number(rel);
  if (typeof rel !== 'object') return null;
  if (rel.id != null && Number.isFinite(Number(rel.id))) return Number(rel.id);

  const connect = rel.connect;
  if (connect != null) {
    if (typeof connect === 'number') return connect;
    if (Array.isArray(connect)) {
      const first = connect[0];
      if (first != null && typeof first === 'object' && first.id != null) return Number(first.id);
      if (typeof first === 'number') return first;
    }
    if (typeof connect === 'object' && connect.id != null) return Number(connect.id);
  }

  return null;
}

async function loadShowtimeRow(strapi, id) {
  return strapi.db.query('api::showtime.showtime').findOne({
    where: { id },
    populate: { movie: true, venue: true, hall: true },
  });
}

async function showtimeExistsAt(strapi, { movieId, venueId, datetime }) {
  const t = datetime.getTime();
  const rows = await strapi.entityService.findMany('api::showtime.showtime', {
    filters: {
      movie: { id: movieId },
      venue: { id: venueId },
      datetime: {
        $gte: new Date(t - 1000).toISOString(),
        $lte: new Date(t + 1000).toISOString(),
      },
    },
    limit: 1,
  });
  return rows.length > 0;
}

/**
 * Δημιουργεί μία προβολή ανά μέρα (ίδια ώρα) από την πρώτη μέρα έως repeat_until.
 * @param {import('@strapi/strapi').Strapi} strapi
 * @param {number} showtimeId
 * @param {string} trigger
 */
async function expandRepeatShowtimes(strapi, showtimeId, trigger = 'expand') {
  const row = await loadShowtimeRow(strapi, showtimeId);
  if (!row?.repeat_until) return { created: 0, skipped: 0, reason: 'no_repeat_until' };

  const startMs = toUtcDateOnly(row.datetime);
  const endMs = toUtcDateOnly(row.repeat_until);
  if (startMs == null || endMs == null) {
    await strapi.db.query('api::showtime.showtime').update({
      where: { id: showtimeId },
      data: { repeat_until: null },
    });
    return { created: 0, skipped: 0, reason: 'invalid_dates' };
  }

  if (endMs < startMs) {
    strapi.log.warn(`[showtime repeat] ${trigger} id=${showtimeId}: repeat_until πριν την έναρξη.`);
    await strapi.db.query('api::showtime.showtime').update({
      where: { id: showtimeId },
      data: { repeat_until: null },
    });
    return { created: 0, skipped: 0, reason: 'end_before_start' };
  }

  const movieId = relationId(row.movie);
  const venueId = relationId(row.venue);
  const hallId = relationId(row.hall);
  if (!movieId || !venueId) {
    strapi.log.warn(`[showtime repeat] ${trigger} id=${showtimeId}: λείπει ταινία ή χώρος.`);
    return { created: 0, skipped: 0, reason: 'missing_relations' };
  }

  const baseData = {
    movie: movieId,
    venue: venueId,
    available_seats: row.available_seats ?? null,
    price: row.price ?? null,
    summer_screening: Boolean(row.summer_screening),
    repeat_until: null,
  };
  if (hallId != null) baseData.hall = hallId;

  let created = 0;
  let skipped = 0;

  for (let day = startMs + MS_DAY; day <= endMs; day += MS_DAY) {
    const dt = datetimeOnDay(day, row.datetime);
    if (await showtimeExistsAt(strapi, { movieId, venueId, datetime: dt })) {
      skipped += 1;
      continue;
    }
    await strapi.entityService.create('api::showtime.showtime', {
      data: { ...baseData, datetime: dt.toISOString() },
    });
    created += 1;
  }

  await strapi.db.query('api::showtime.showtime').update({
    where: { id: showtimeId },
    data: { repeat_until: null },
  });

  strapi.log.info(
    `[showtime repeat] ${trigger} id=${showtimeId}: +${created} προβολές, ${skipped} υπήρχαν (${new Date(startMs).toISOString().slice(0, 10)} → ${new Date(endMs).toISOString().slice(0, 10)})`,
  );

  return { created, skipped, reason: 'ok' };
}

/** Εκκρεμείς εγγραφές με repeat_until (μετά από αποτυχημένο lifecycle). */
async function expandAllPendingRepeatShowtimes(strapi) {
  const pending = await strapi.db.query('api::showtime.showtime').findMany({
    where: { repeat_until: { $notNull: true } },
    select: ['id'],
  });
  for (const row of pending) {
    await expandRepeatShowtimes(strapi, row.id, 'bootstrap');
  }
}

module.exports = {
  expandRepeatShowtimes,
  expandAllPendingRepeatShowtimes,
};
