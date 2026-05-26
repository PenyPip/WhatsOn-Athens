'use strict';

const {
  getUpcomingCinemaWeekBounds,
  showtimeOverlapsRange,
  formatWeekLabel,
} = require('../../../utils/cinemaWeek');

const AUTO_LINE_RE = /^[✓⚠]/;

function splitVenueInfo(text) {
  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) return { autoLine: '', manual: '' };
  const parts = raw.split(/\n---\n/);
  if (parts.length >= 2) {
    return { autoLine: parts[0].trim(), manual: parts.slice(1).join('\n---\n').trim() };
  }
  const lines = raw.split('\n');
  const autoLines = [];
  const manualLines = [];
  for (const line of lines) {
    if (AUTO_LINE_RE.test(line.trim())) autoLines.push(line);
    else manualLines.push(line);
  }
  return { autoLine: autoLines.join('\n').trim(), manual: manualLines.join('\n').trim() };
}

function mergeVenueInfo(autoLine, manual) {
  if (!autoLine) return manual || '';
  if (!manual) return autoLine;
  return `${autoLine}\n---\n${manual}`;
}

/** Έχει ήδη τρέξει sync (αυτόματη γραμμή ✓/⚠ στο info). */
function hasAutoProgramLine(info) {
  const { autoLine } = splitVenueInfo(info);
  return AUTO_LINE_RE.test((autoLine || '').trim());
}

const PROGRAM_STORE = { type: 'plugin', name: 'venue-program-status' };
const INITIAL_SYNC_KEY = 'initialSyncDone';

function formatAthensNow() {
  return new Date().toLocaleString('el-GR', {
    timeZone: 'Europe/Athens',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function countUpcomingWeekShowtimes(strapi, venueId, now = new Date()) {
  const { start, end } = getUpcomingCinemaWeekBounds(now);
  const showtimes = await strapi.entityService.findMany('api::showtime.showtime', {
    filters: { venue: { id: venueId } },
    fields: ['datetime', 'week_end', 'schedule_kind'],
    publicationState: 'preview',
    limit: 5000,
  });
  let count = 0;
  for (const st of showtimes) {
    if (showtimeOverlapsRange(st, start, end, now)) count += 1;
  }
  return { count, start, end };
}

/**
 * Ενημέρωση needs_update (αυτόματο) + γραμμή στο info. Το updated μένει χειροκίνητο.
 */
async function syncVenueProgramStatus(strapi, venueId, options = {}) {
  const { logChange = false, onlyIfNotUpdated = false, forceAll = false } = options;
  const venue = await strapi.entityService.findOne('api::venue.venue', venueId, {
    fields: ['name', 'type', 'needs_update', 'updated', 'info'],
    publicationState: 'preview',
  });
  if (!venue || venue.type !== 'cinema') {
    return { skipped: true };
  }

  const neverSynced = !hasAutoProgramLine(venue.info);
  if (onlyIfNotUpdated && !forceAll && venue.updated && !neverSynced) {
    return { skipped: true, reason: 'already_completed' };
  }

  const now = new Date();
  const { count, start, end } = await countUpcomingWeekShowtimes(strapi, venueId, now);
  const weekLabel = formatWeekLabel(start, end);
  const hasProgram = count > 0;
  const needsUpdate = !hasProgram;
  const hadNeedsUpdate = venue.needs_update !== false;

  const autoLine = hasProgram
    ? `✓ Πρόγραμμα επόμενης εβδομάδας (${weekLabel}): ${count} προβολές — έλεγχος ${formatAthensNow()}`
    : `⚠ Χρειάζεται πρόγραμμα επόμενης εβδομάδας (${weekLabel}) — έλεγχος ${formatAthensNow()}`;

  const { manual } = splitVenueInfo(venue.info);
  const info = mergeVenueInfo(autoLine, manual);

  const data = { needs_update: needsUpdate, info };
  if (neverSynced || venue.updated == null) {
    data.updated = false;
  }

  await strapi.entityService.update('api::venue.venue', venueId, {
    data,
  });

  if (logChange && hadNeedsUpdate && !needsUpdate) {
    strapi.log.info(`[program] ${venue.name}: προστέθηκαν προβολές για ${weekLabel} (${count})`);
  }
  if (logChange && !hadNeedsUpdate && needsUpdate) {
    strapi.log.info(`[program] ${venue.name}: λείπει πρόγραμμα για ${weekLabel}`);
  }

  return {
    hasProgram,
    count,
    weekLabel,
    needsUpdate,
    completed: Boolean(venue.updated),
  };
}

/** Κάθε Σάββατο: updated → false (νέα εβδομάδα, ξανά «ολοκλήρωσα»). */
async function resetCinemaManualCompleted(strapi) {
  const venues = await strapi.entityService.findMany('api::venue.venue', {
    filters: { type: 'cinema' },
    fields: ['id'],
    publicationState: 'preview',
  });
  for (const v of venues) {
    await strapi.entityService.update('api::venue.venue', v.id, {
      data: { updated: false },
    });
  }
  return venues.length;
}

async function isInitialProgramSyncDone(strapi) {
  return Boolean(await strapi.store(PROGRAM_STORE).get({ key: INITIAL_SYNC_KEY }));
}

/** Πρώτη εκτέλεση cron: όλα τα σινεμά, updated=false όπου δεν είχε γίνει sync. */
async function runInitialProgramBootstrap(strapi, options = {}) {
  const store = strapi.store(PROGRAM_STORE);
  if (await store.get({ key: INITIAL_SYNC_KEY })) {
    return null;
  }
  const summary = await syncAllCinemaVenues(strapi, {
    ...options,
    logChange: options.logChange !== false,
    forceAll: true,
    onlyIfNotUpdated: false,
  });
  await store.set({ key: INITIAL_SYNC_KEY, value: true });
  strapi.log.info(
    `[program] αρχικός sync: ${summary.total} σινεμά, ${summary.complete} με προβολές, ${summary.missing} needs_update`,
  );
  return summary;
}

async function syncAllCinemaVenues(strapi, options = {}) {
  const {
    resetManualCompleted = false,
    logChange = false,
    onlyIfNotUpdated = false,
    forceAll = false,
    bootstrapIfNeeded = false,
  } = options;

  if (bootstrapIfNeeded && !resetManualCompleted) {
    const boot = await runInitialProgramBootstrap(strapi, { logChange });
    if (boot) return { ...boot, bootstrapped: true };
  }

  if (resetManualCompleted) {
    await resetCinemaManualCompleted(strapi);
  }
  const filters = { type: 'cinema' };
  if (onlyIfNotUpdated && !resetManualCompleted && !forceAll) {
    filters.$or = [
      { updated: false },
      { updated: { $null: true } },
      { info: { $null: true } },
      { info: '' },
    ];
  }
  const venues = await strapi.entityService.findMany('api::venue.venue', {
    filters,
    fields: ['id'],
    publicationState: 'preview',
  });
  const summary = { total: venues.length, complete: 0, missing: 0, pendingManual: 0 };
  for (const v of venues) {
    const r = await syncVenueProgramStatus(strapi, v.id, { logChange, onlyIfNotUpdated, forceAll });
    if (r.skipped) continue;
    if (r.hasProgram) summary.complete += 1;
    else summary.missing += 1;
    if (!r.completed) summary.pendingManual += 1;
  }
  return summary;
}

async function syncVenueForShowtime(strapi, showtimeId) {
  const st = await strapi.entityService.findOne('api::showtime.showtime', showtimeId, {
    populate: { venue: { fields: ['id', 'type'] } },
    publicationState: 'preview',
  });
  const venueId = st?.venue?.id;
  if (!venueId) return;
  await syncVenueProgramStatus(strapi, venueId, { logChange: true, onlyIfNotUpdated: true });
}

module.exports = {
  syncVenueProgramStatus,
  syncAllCinemaVenues,
  syncVenueForShowtime,
  resetCinemaManualCompleted,
  runInitialProgramBootstrap,
  isInitialProgramSyncDone,
  countUpcomingWeekShowtimes,
  hasAutoProgramLine,
};
