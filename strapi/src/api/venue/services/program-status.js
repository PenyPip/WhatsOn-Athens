'use strict';

const {
  VENUE_UPDATED_STATUS,
  migrateVenueUpdatedBooleanToEnum,
} = require('./venue-updated-status');

/**
 * Το `updated` ενημερώνεται αυτόματα από More sync (σινεμά) και χειροκίνητα από administrator.
 */

async function syncVenueProgramStatus() {
  return { skipped: true, reason: 'disabled' };
}

async function syncAllCinemaVenues() {
  return { total: 0, ok: 0, pendingManual: 0, skipped: true, reason: 'disabled' };
}

function scheduleVenueProgramSync() {
  return;
}

async function scheduleVenueProgramSyncFromShowtime() {
  return;
}

function venueHasAthinoramaLink(row) {
  return Boolean(String(row?.athinorama_link || '').trim());
}

/**
 * Σάββατο 06:00 — όλα τα σινεμά → no_new, ΕΚΤΟΣ όσων έχουν athinorama_link
 * (αυτά μένουν μέχρι Δευτέρα · complete μόνο από Athinorama Πέμπτη).
 */
async function resetCinemaManualCompleted(strapi) {
  await migrateVenueUpdatedBooleanToEnum(strapi);

  const athinoramaIds = [];
  for (let page = 1; ; page += 1) {
    const rows = await strapi.entityService.findMany('api::venue.venue', {
      filters: { type: 'cinema', athinorama_link: { $notNull: true } },
      fields: ['id', 'athinorama_link'],
      publicationState: 'preview',
      pagination: { page, pageSize: 200 },
    });
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) break;
    for (const row of list) {
      if (venueHasAthinoramaLink(row)) athinoramaIds.push(row.id);
    }
    if (list.length < 200) break;
  }

  const where =
    athinoramaIds.length > 0
      ? { type: 'cinema', id: { $notIn: athinoramaIds } }
      : { type: 'cinema' };

  const result = await strapi.db.query('api::venue.venue').updateMany({
    where,
    data: { updated: VENUE_UPDATED_STATUS.NO_NEW },
  });
  const count = typeof result?.count === 'number' ? result.count : 0;
  if (count > 0) {
    strapi.log.info(
      `[whatson] venue updated → no_new (Σάββατο πρωί): ${count} σινεμά` +
        (athinoramaIds.length ? ` · εξαιρέθηκαν ${athinoramaIds.length} Athinorama` : ''),
    );
  }
  return count;
}

/**
 * Δευτέρα 06:00 — μόνο σινεμά με athinorama_link → no_new.
 * Complete ξανά μόνο μετά Athinorama sync Πέμπτης.
 */
async function resetAthinoramaCinemaUpdatedToNoNew(strapi) {
  await migrateVenueUpdatedBooleanToEnum(strapi);

  let count = 0;
  for (let page = 1; ; page += 1) {
    const rows = await strapi.entityService.findMany('api::venue.venue', {
      filters: { type: 'cinema', athinorama_link: { $notNull: true } },
      fields: ['id', 'athinorama_link', 'updated'],
      publicationState: 'preview',
      pagination: { page, pageSize: 200 },
    });
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) break;
    for (const row of list) {
      if (!venueHasAthinoramaLink(row)) continue;
      if (row.updated === VENUE_UPDATED_STATUS.NO_NEW) continue;
      await strapi.entityService.update('api::venue.venue', row.id, {
        data: { updated: VENUE_UPDATED_STATUS.NO_NEW },
      });
      count += 1;
    }
    if (list.length < 200) break;
  }

  if (count > 0) {
    strapi.log.info(`[whatson] Athinorama venue updated → no_new (Δευτέρα πρωί): ${count} σινεμά`);
  }
  return count;
}

async function runInitialProgramBootstrap() {
  return null;
}

async function isInitialProgramSyncDone() {
  return true;
}

async function countUpcomingWeekShowtimes() {
  return { count: 0, start: null, end: null };
}

function hasAutoProgramLine() {
  return false;
}

function computeNeedsUpdate() {
  return false;
}

module.exports = {
  syncVenueProgramStatus,
  syncAllCinemaVenues,
  scheduleVenueProgramSync,
  scheduleVenueProgramSyncFromShowtime,
  resetCinemaManualCompleted,
  resetAthinoramaCinemaUpdatedToNoNew,
  venueHasAthinoramaLink,
  runInitialProgramBootstrap,
  isInitialProgramSyncDone,
  countUpcomingWeekShowtimes,
  hasAutoProgramLine,
  computeNeedsUpdate,
};
