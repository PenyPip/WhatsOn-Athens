'use strict';

const ATHENS_TZ = 'Europe/Athens';
const { runAsRepeatChild } = require('./repeat-context');
const { buildRepeatExpandTrace } = require('../../../utils/moreImportTrace');

/** Αποφυγή επαναλήψης όταν τα child create / clearRepeatHelpers ενεργοποιούν lifecycle. */
const expandingIds = new Set();

/** YYYY-MM-DD στην τοπική ημερολογιακή ζώνη Αθήνας. */
function athensDateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: ATHENS_TZ }).format(d);
}

function athensTimeParts(template) {
  const d = template instanceof Date ? template : new Date(template);
  if (Number.isNaN(d.getTime())) return { hour: 0, minute: 0, second: 0 };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ATHENS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const pick = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: pick('hour'), minute: pick('minute'), second: pick('second') };
}

/** UTC Date όταν στην Αθήνα είναι dateKey + ώρα από template. */
function datetimeOnAthensDay(dateKey, template) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const { hour, minute, second } = athensTimeParts(template);
  const utcGuess = Date.UTC(y, m - 1, d, hour, minute, second);
  const inv = new Date(utcGuess).toLocaleString('en-US', { timeZone: 'UTC' });
  const loc = new Date(utcGuess).toLocaleString('en-US', { timeZone: ATHENS_TZ });
  const offset = new Date(inv).getTime() - new Date(loc).getTime();
  return new Date(utcGuess + offset);
}

function addDaysToDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function* eachDateKeyInclusive(startKey, endKey) {
  if (!startKey || !endKey || startKey > endKey) return;
  let cur = startKey;
  for (;;) {
    yield cur;
    if (cur === endKey) break;
    cur = addDaysToDateKey(cur, 1);
  }
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

/** Set με YYYY-MM-DD (Αθήνα) από repeatable component. */
function parseSkipDays(raw) {
  const set = new Set();
  if (!Array.isArray(raw)) return set;
  for (const item of raw) {
    const d = item?.day ?? item?.attributes?.day;
    const key = athensDateKey(d);
    if (key != null) set.add(key);
  }
  return set;
}

async function loadShowtimeRow(strapi, id) {
  try {
    return await strapi.entityService.findOne('api::showtime.showtime', id, {
      populate: { movie: true, venue: true, hall: true, repeat_skip_days: true },
    });
  } catch (e) {
    strapi.log.warn(`[showtime repeat] loadShowtimeRow id=${id}: ${e?.message ?? e}`);
    return null;
  }
}

function resolveRepeatUntil(row, overrideUntil) {
  if (overrideUntil != null && overrideUntil !== '') return overrideUntil;
  return row?.repeat_until ?? null;
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

async function deleteShowtimesOnDay(strapi, { movieId, venueId, dateKey, templateDatetime, keepId }) {
  const dt = datetimeOnAthensDay(dateKey, templateDatetime);
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

async function applySkipDaysInRange(strapi, row, showtimeId, startKey, endKey, skipDays) {
  let removed = 0;
  for (const dayKey of skipDays) {
    if (dayKey < startKey || dayKey > endKey) continue;
    removed += await deleteShowtimesOnDay(strapi, {
      movieId: relationId(row.movie),
      venueId: relationId(row.venue),
      dateKey: dayKey,
      templateDatetime: row.datetime,
      keepId: dayKey === startKey ? showtimeId : null,
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
 * @param {object} [opts]
 * @param {string|Date|null} [opts.overrideUntil] — repeat_until από το request (πριν/μετά το clear στο DB).
 */
async function expandRepeatShowtimes(strapi, showtimeId, trigger = 'expand', opts = {}) {
  const id = Number(showtimeId);
  if (!Number.isFinite(id)) {
    return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'invalid_id' };
  }

  if (expandingIds.has(id)) {
    return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'reentrant' };
  }
  expandingIds.add(id);

  try {
    const row = await loadShowtimeRow(strapi, id);
    if (!row) return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'not_found' };

    const overrideUntil = opts.overrideUntil;
    const repeatUntil = resolveRepeatUntil(row, overrideUntil);

    if (row.schedule_kind === 'week_block') {
      const untilKey = athensDateKey(repeatUntil);
      if (untilKey && !row.week_end) {
        await strapi.db.query('api::showtime.showtime').update({
          where: { id },
          data: { week_end: untilKey },
        });
      }
      await clearRepeatHelpers(strapi, id);
      strapi.log.info(`[showtime repeat] ${trigger} id=${id}: week_block (week_end στο CMS, όχι ξεχωριστές προβολές/μέρα)`);
      return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'week_block' };
    }

    const skipDays = parseSkipDays(row.repeat_skip_days);
    const hasUntil = Boolean(repeatUntil);
    const hasSkips = skipDays.size > 0;

    if (!hasUntil && !hasSkips) {
      return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'nothing_to_do' };
    }

    const startKey = athensDateKey(row.datetime);
    if (startKey == null) {
      await clearRepeatHelpers(strapi, id);
      return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'invalid_start' };
    }

    const movieId = relationId(row.movie);
    const venueId = relationId(row.venue);
    const hallId = relationId(row.hall);
    if (!movieId || !venueId) {
      strapi.log.warn(
        `[showtime repeat] ${trigger} id=${id}: λείπει ταινία (${movieId}) ή χώρος (${venueId}). Σύνδεσε relations στο CMS.`,
      );
      return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'missing_relations' };
    }

    const endKey = hasUntil ? athensDateKey(repeatUntil) : startKey;
    if (hasUntil && endKey == null) {
      await clearRepeatHelpers(strapi, id);
      return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'invalid_end' };
    }

    if (hasUntil && endKey < startKey) {
      strapi.log.warn(`[showtime repeat] ${trigger} id=${id}: repeat_until (${endKey}) πριν την έναρξη (${startKey}).`);
      await clearRepeatHelpers(strapi, id);
      return { created: 0, skipped: 0, excluded: 0, removed: 0, reason: 'end_before_start' };
    }

    if (!hasUntil && hasSkips) {
      let removed = 0;
      for (const dayKey of skipDays) {
        removed += await deleteShowtimesOnDay(strapi, {
          movieId,
          venueId,
          dateKey: dayKey,
          templateDatetime: row.datetime,
          keepId: dayKey === startKey ? id : null,
        });
      }
      await clearRepeatHelpers(strapi, id);
      strapi.log.info(`[showtime repeat] ${trigger} id=${id}: αφαιρέθηκαν ${removed} προβολές (εξαιρέσεις).`);
      return { created: 0, skipped: 0, excluded: skipDays.size, removed, reason: 'skip_only' };
    }

    let removed = 0;

    const baseData = {
      movie: movieId,
      venue: venueId,
      schedule_kind: 'exact',
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

    for (const dayKey of eachDateKeyInclusive(startKey, endKey)) {
      if (dayKey === startKey) continue;

      if (skipDays.has(dayKey)) {
        excluded += 1;
        await deleteShowtimesOnDay(strapi, {
          movieId,
          venueId,
          dateKey: dayKey,
          templateDatetime: row.datetime,
          keepId: null,
        });
        continue;
      }

      const dt = datetimeOnAthensDay(dayKey, row.datetime);
      if (await showtimeExistsAt(strapi, { movieId, venueId, datetime: dt })) {
        skipped += 1;
        continue;
      }

      await runAsRepeatChild(() =>
        strapi.entityService.create('api::showtime.showtime', {
          data: {
            ...baseData,
            datetime: dt.toISOString(),
            import_source: 'repeat_expand',
            import_trace: buildRepeatExpandTrace({
              sourceShowtimeId: id,
              startKey,
              endKey,
              trigger,
            }),
          },
        }),
      );
      created += 1;
    }

    if (hasSkips) {
      removed += await applySkipDaysInRange(strapi, row, id, startKey, endKey, skipDays);
    }

    await clearRepeatHelpers(strapi, id);

    strapi.log.info(
      `[showtime repeat] ${trigger} id=${id}: +${created} προβολές, ${skipped} υπήρχαν, ${excluded} εξαιρέσεις, ${removed} διαγράφηκαν (${startKey} → ${endKey})`,
    );

    return { created, skipped, excluded, removed, reason: 'ok' };
  } finally {
    expandingIds.delete(id);
  }
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
