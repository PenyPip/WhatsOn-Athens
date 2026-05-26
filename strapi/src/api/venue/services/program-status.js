'use strict';

const {
  getUpcomingCinemaWeekBounds,
  showtimeOverlapsRange,
  formatWeekLabel,
} = require('../../../utils/cinemaWeek');
const { checkExternalProgramForWeek } = require('../../../utils/externalProgramCheck');
const { resolveProgramUrl, isSafeProgramUrl } = require('../../../utils/programUrl');
const { isCinemaVenue, cinemaVenueTypeFilter } = require('../../../utils/cinemaVenueType');

const EXTERNAL_FETCH_GAP_MS = 800;

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

/** Έχει ήδη τρέξει sync (αυτόματη γραμμή ✓/⚠ στο info_update). */
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/** Έλεγχος link στο info — ημερομηνίες επόμενης εβδομάδας κινηματογράφου στη σελίδα. */
async function evaluateVenueProgram(strapi, venue, now = new Date()) {
  const programUrl = resolveProgramUrl(venue);
  const strapiCounts = await countUpcomingWeekShowtimes(strapi, venue.id, now);
  const weekLabel = strapiCounts.start ? formatWeekLabel(strapiCounts.start, strapiCounts.end) : '';

  if (!programUrl) {
    const hasProgram = strapiCounts.count > 0;
    return {
      source: 'no_link',
      weekLabel,
      hasProgram,
      count: strapiCounts.count,
      matchedDays: 0,
      programUrl: null,
      autoLine: hasProgram
        ? `✓ Πρόγραμμα (${weekLabel}): ${strapiCounts.count} προβολές στο CMS — λείπει link στο info — έλεγχος ${formatAthensNow()}`
        : `⚠ Βάλε link προγράμματος στο info — έλεγχος ${formatAthensNow()}`,
    };
  }

  if (!isSafeProgramUrl(programUrl)) {
    return {
      source: 'unsafe_url',
      weekLabel,
      hasProgram: false,
      count: strapiCounts.count,
      matchedDays: 0,
      programUrl,
      autoLine: `⚠ Μη έγκυρο URL προγράμματος — έλεγχος ${formatAthensNow()}`,
    };
  }

  const external = await checkExternalProgramForWeek(programUrl, now);
  const label = external.weekLabel || weekLabel;

  if (external.error) {
    return {
      source: 'link_error',
      weekLabel: label,
      hasProgram: false,
      count: strapiCounts.count,
      matchedDays: 0,
      programUrl,
      autoLine: `⚠ Δεν διαβάστηκε το link (${label}): ${external.error} — έλεγχος ${formatAthensNow()}`,
    };
  }

  if (external.hasProgram) {
    return {
      source: 'link',
      weekLabel: label,
      hasProgram: true,
      count: strapiCounts.count,
      matchedDays: external.matchedDays,
      programUrl,
      autoLine: `✓ Πρόγραμμα στο link (${label}): ${external.matchedDays} ημέρες με ημερομηνίες — έλεγχος ${formatAthensNow()}`,
    };
  }

  return {
    source: 'link',
    weekLabel: label,
    hasProgram: false,
    count: strapiCounts.count,
    matchedDays: 0,
    programUrl,
    autoLine: `⚠ Χρειάζεται πρόγραμμα (${label}) — στο link δεν φαίνονται ημερομηνίες επόμενης εβδομάδας — έλεγχος ${formatAthensNow()}`,
  };
}

/**
 * Ενημέρωση needs_update (αυτόματο) + γραμμή στο info_update. Το info δεν αγγίζεται. Το updated χειροκίνητο.
 */
async function syncVenueProgramStatus(strapi, venueId, options = {}) {
  const { logChange = false, onlyIfNotUpdated = false, forceAll = false } = options;
  const venue = await strapi.entityService.findOne('api::venue.venue', venueId, {
    fields: ['name', 'type', 'needs_update', 'updated', 'info', 'info_update'],
    publicationState: 'preview',
  });
  if (!venue || !isCinemaVenue(venue)) {
    return { skipped: true };
  }

  const neverSynced = !hasAutoProgramLine(venue.info_update);
  if (onlyIfNotUpdated && !forceAll && venue.updated && !neverSynced) {
    return { skipped: true, reason: 'already_completed' };
  }

  const now = new Date();
  const evaluation = await evaluateVenueProgram(strapi, venue, now);
  const { hasProgram, weekLabel, count, autoLine } = evaluation;
  const needsUpdate = !hasProgram;
  const hadNeedsUpdate = venue.needs_update !== false;

  const { manual } = splitVenueInfo(venue.info_update);
  const info_update = mergeVenueInfo(autoLine, manual);

  const data = { needs_update: needsUpdate, info_update };
  if (neverSynced || venue.updated == null) {
    data.updated = false;
  }

  await strapi.entityService.update('api::venue.venue', venueId, {
    data,
  });

  if (logChange && hadNeedsUpdate && !needsUpdate) {
    strapi.log.info(`[program] ${venue.name}: OK για ${weekLabel} (${evaluation.source})`);
  }
  if (logChange && !hadNeedsUpdate && needsUpdate) {
    strapi.log.info(`[program] ${venue.name}: λείπει πρόγραμμα για ${weekLabel} (${evaluation.source})`);
  }

  return {
    hasProgram,
    count,
    weekLabel,
    needsUpdate,
    completed: Boolean(venue.updated),
    source: evaluation.source,
    programUrl: evaluation.programUrl,
  };
}

/** Κάθε Σάββατο: updated → false (νέα εβδομάδα, ξανά «ολοκλήρωσα»). */
async function resetCinemaManualCompleted(strapi) {
  const venues = await strapi.entityService.findMany('api::venue.venue', {
    filters: cinemaVenueTypeFilter(),
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
  const filters = cinemaVenueTypeFilter();
  if (onlyIfNotUpdated && !resetManualCompleted && !forceAll) {
    filters.$or = [
      { updated: false },
      { updated: { $null: true } },
      { info_update: { $null: true } },
      { info_update: '' },
    ];
  }
  const venues = await strapi.entityService.findMany('api::venue.venue', {
    filters,
    fields: ['id'],
    publicationState: 'preview',
  });
  const summary = { total: venues.length, complete: 0, missing: 0, pendingManual: 0 };
  let fetchedLink = false;
  for (const v of venues) {
    if (fetchedLink) await sleep(EXTERNAL_FETCH_GAP_MS);
    const r = await syncVenueProgramStatus(strapi, v.id, { logChange, onlyIfNotUpdated, forceAll });
    if (r.skipped) continue;
    if (r.programUrl) fetchedLink = true;
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
