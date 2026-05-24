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

/** Set με UTC-midnight timestamps από repeatable component. */
function parseSkipDays(raw) {
  const set = new Set();
  if (!Array.isArray(raw)) return set;
  for (const item of raw) {
    const d = item?.day ?? item?.attributes?.day;
    const ms = toUtcDateOnly(d);
    if (ms != null) set.add(ms);
  }
  return set;
}

async function loadShowtimeRow(strapi, id) {
  return strapi.db.query('api::showtime.showtime').findOne({
    where: { id },
    populate: { movie: true, venue: true, hall: true, repeat_skip_days: true },
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

async function deleteShowtimesOnDay(strapi, { movieId, venueId, dayUtc, templateDatetime, keepId }) {
  const dt = datetimeOnDay(dayUtc, templateDatetime);
  const t = dt.getTime();
  const rows = await strapi.entityService.findMany('api::showtime.showtime', {
    filters: {
      movie: { id: movieId },
      venue: { id: venueId },
      datetime: {
        $gte: new Date(t - 1000).toISOString(),
        $lte: new Date(t + 1000).toISOString(),
      },
    },
    limit: 20,
  });

  let removed = 0;
  for (const row of rows) {
    if (Number(row.id) === Number(keepId)) continue;
    await strapi.entityService.delete('api::showtime.showtime', row.id);
    removed += 1;
  }
  return removed;
}

async function applySkipDaysInRange(strapi, row, showtimeId, startMs, endMs, skipDays) {
  let removed = 0;
  for (const day of skipDays) {
    if (day < startMs || day > endMs) continue;
    removed += await deleteShowtimesOnDay(strapi, {
      movieId: relationId(row.movie),
      venueId: relationId(row.venue),
      dayUtc: day,
      templateDatetime: row.datetime,
      keepId: day === startMs ? showtimeId : null,
    });
  }
  return removed;
}

async function clearRepeatHelpers(strapi, showtimeId) {
  await strapi.db.query('api::showtime.showtime').update({
    where: { id: showtimeId },
    data: { repeat_until: null, repeat_skip_days: [] },
  });
}

/**
 * Επανάληψη ημερών + εξαιρέσεις. Μόνο εξαιρέσεις (χωρίς repeat_until): διαγραφή στις listed μέρες.
 */
async function expandRepeatShowtimes(strapi, showtimeId, trigger = 'expand') {
  const row = await loadShowtimeRow(strapi, showtimeId);
  if (!row) return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'not_found' };

  if (row.schedule_kind === 'week_block') {
    await clearRepeatHelpers(strapi, showtimeId);
    return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'week_block' };
  }

  const skipDays = parseSkipDays(row.repeat_skip_days);
  const hasUntil = Boolean(row.repeat_until);
  const hasSkips = skipDays.size > 0;

  if (!hasUntil && !hasSkips) {
    return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'nothing_to_do' };
  }

  const startMs = toUtcDateOnly(row.datetime);
  if (startMs == null) {
    await clearRepeatHelpers(strapi, showtimeId);
    return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'invalid_start' };
  }

  const movieId = relationId(row.movie);
  const venueId = relationId(row.venue);
  const hallId = relationId(row.hall);
  if (!movieId || !venueId) {
    strapi.log.warn(`[showtime repeat] ${trigger} id=${showtimeId}: λείπει ταινία ή χώρος.`);
    return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'missing_relations' };
  }

  let endMs = hasUntil ? toUtcDateOnly(row.repeat_until) : startMs;
  if (hasUntil && endMs == null) {
    await clearRepeatHelpers(strapi, showtimeId);
    return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'invalid_end' };
  }

  if (hasUntil && endMs < startMs) {
    strapi.log.warn(`[showtime repeat] ${trigger} id=${showtimeId}: repeat_until πριν την έναρξη.`);
    await clearRepeatHelpers(strapi, showtimeId);
    return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'end_before_start' };
  }

  if (!hasUntil && hasSkips) {
    let removed = 0;
    for (const day of skipDays) {
      removed += await deleteShowtimesOnDay(strapi, {
        movieId,
        venueId,
        dayUtc: day,
        templateDatetime: row.datetime,
        keepId: day === startMs ? showtimeId : null,
      });
    }
    await clearRepeatHelpers(strapi, showtimeId);
    strapi.log.info(`[showtime repeat] ${trigger} id=${showtimeId}: αφαιρέθηκαν ${removed} προβολές (εξαιρέσεις).`);
    return { created: 0, skipped: 0, excluded: skipDays.size, removed, reason: 'skip_only' };
  }

  let removed = 0;

  const baseData = {
    movie: movieId,
    venue: venueId,
    available_seats: row.available_seats ?? null,
    price: row.price ?? null,
    summer_screening: Boolean(row.summer_screening),
    repeat_until: null,
    repeat_skip_days: [],
  };
  if (hallId != null) baseData.hall = hallId;

  let created = 0;
  let skipped = 0;
  let excluded = 0;

  for (let day = startMs + MS_DAY; day <= endMs; day += MS_DAY) {
    if (skipDays.has(day)) {
      excluded += 1;
      await deleteShowtimesOnDay(strapi, {
        movieId,
        venueId,
        dayUtc: day,
        templateDatetime: row.datetime,
        keepId: null,
      });
      continue;
    }
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

  if (hasSkips) {
    removed += await applySkipDaysInRange(strapi, row, showtimeId, startMs, endMs, skipDays);
  }

  await clearRepeatHelpers(strapi, showtimeId);

  strapi.log.info(
    `[showtime repeat] ${trigger} id=${showtimeId}: +${created} προβολές, ${skipped} υπήρχαν, ${excluded} εξαιρέσεις, ${removed} διαγράφηκαν (${new Date(startMs).toISOString().slice(0, 10)} → ${new Date(endMs).toISOString().slice(0, 10)})`,
  );

  return { created, skipped, excluded, removed, reason: 'ok' };
}

/** Εκκρεμείς εγγραφές με repeat_until. */
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
