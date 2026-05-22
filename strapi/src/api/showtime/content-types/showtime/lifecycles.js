'use strict';

const MS_DAY = 24 * 60 * 60 * 1000;

/** Ημερομηνία (UTC date parts) από datetime ή date-only string. */
function toUtcDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Ίδια ημερομηνία + ώρα/λεπτά όπως το πρότυπο (UTC). */
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
  if (typeof rel === 'number') return rel;
  if (typeof rel === 'string' && /^\d+$/.test(rel)) return Number(rel);
  if (typeof rel === 'object' && rel.id != null) return Number(rel.id);
  return null;
}

async function showtimeExistsAt(strapi, { movieId, venueId, datetime }) {
  const iso = datetime.toISOString();
  const count = await strapi.entityService.count('api::showtime.showtime', {
    filters: {
      movie: { id: movieId },
      venue: { id: venueId },
      datetime: iso,
    },
  });
  return count > 0;
}

module.exports = {
  async afterCreate(event) {
    const { result } = event;
    const repeatUntilRaw = result.repeat_until;
    if (!repeatUntilRaw) return;

    const startMs = toUtcDateOnly(result.datetime);
    const endMs = toUtcDateOnly(repeatUntilRaw);
    if (startMs == null || endMs == null || endMs <= startMs) {
      await strapi.entityService.update('api::showtime.showtime', result.id, {
        data: { repeat_until: null },
      });
      return;
    }

    const movieId = relationId(result.movie);
    const venueId = relationId(result.venue);
    if (!movieId || !venueId) {
      strapi.log.warn('[showtime repeat] Λείπει ταινία ή χώρος — δεν επεκτάθηκε η επανάληψη.');
      return;
    }

    const hallId = relationId(result.hall);
    const baseData = {
      movie: movieId,
      venue: venueId,
      available_seats: result.available_seats ?? null,
      price: result.price ?? null,
      summer_screening: Boolean(result.summer_screening),
      repeat_until: null,
    };
    if (hallId != null) baseData.hall = hallId;

    let created = 0;
    let skipped = 0;

    for (let day = startMs + MS_DAY; day <= endMs; day += MS_DAY) {
      const dt = datetimeOnDay(day, result.datetime);
      const exists = await showtimeExistsAt(strapi, { movieId, venueId, datetime: dt });
      if (exists) {
        skipped += 1;
        continue;
      }
      await strapi.entityService.create('api::showtime.showtime', {
        data: {
          ...baseData,
          datetime: dt.toISOString(),
        },
      });
      created += 1;
    }

    await strapi.entityService.update('api::showtime.showtime', result.id, {
      data: { repeat_until: null },
    });

    if (created > 0 || skipped > 0) {
      strapi.log.info(
        `[showtime repeat] id=${result.id}: +${created} προβολές, ${skipped} ήδη υπήρχαν (${new Date(startMs).toISOString().slice(0, 10)} → ${new Date(endMs).toISOString().slice(0, 10)})`,
      );
    }
  },
};
