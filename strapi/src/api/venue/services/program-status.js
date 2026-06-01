'use strict';

/**
 * Όλο το αυτόματο program sync καταργήθηκε.
 * Ο administrator διαχειρίζεται χειροκίνητα μόνο το `updated`.
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

async function resetCinemaManualCompleted(strapi) {
  const result = await strapi.db.query('api::venue.venue').updateMany({
    where: { type: 'cinema' },
    data: { updated: false },
  });
  const count = typeof result?.count === 'number' ? result.count : 0;
  if (count > 0) {
    strapi.log.info(`[whatson] venue updated → false (Δευτέρα πρωί): ${count} σινεμά`);
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
  runInitialProgramBootstrap,
  isInitialProgramSyncDone,
  countUpcomingWeekShowtimes,
  hasAutoProgramLine,
  computeNeedsUpdate,
};
