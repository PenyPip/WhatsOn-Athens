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
/** Μετά από αποθήκευση προβολής — ένας έλεγχος ανά χώρο (όχι μπλοκάρισμα admin). */
const VENUE_SYNC_DEBOUNCE_MS = 5_000;

const pendingVenueSyncTimers = new Map();

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

/**
 * needs_update: true μόνο αν στο link φαίνονται ημερομηνίες επόμενης εβδομάδας
 * και δεν έχουν μπει ακόμα στο CMS. Όχι επειδή «λείπουν» από το link — αυτό το updated.
 */
function computeNeedsUpdate({ linkHasDates, cmsCount }) {
  return Boolean(linkHasDates && cmsCount === 0);
}

/** Έλεγχος more_link (κορυφή σελίδας: μέρες κάλυψης, Πέμ–Τετ) + σύγκριση με CMS. */
async function evaluateVenueProgram(strapi, venue, now = new Date()) {
  const programUrl = resolveProgramUrl(venue);
  const strapiCounts = await countUpcomingWeekShowtimes(strapi, venue.id, now);
  const weekLabel = strapiCounts.start ? formatWeekLabel(strapiCounts.start, strapiCounts.end) : '';
  const cmsCount = strapiCounts.count;
  const checked = formatAthensNow();

  const base = {
    weekLabel,
    cmsCount,
    linkHasDates: false,
    matchedDays: 0,
    programUrl: programUrl || null,
    needsUpdate: false,
  };

  if (!programUrl) {
    return {
      ...base,
      source: 'no_link',
      autoLine: cmsCount
        ? `✓ CMS (${weekLabel}): ${cmsCount} προβολές — λείπει more_link — έλεγχος ${checked}`
        : `— (${weekLabel}): χωρίς more_link · έλεγχος με «ολοκλήρωσα» (updated) — ${checked}`,
    };
  }

  if (!isSafeProgramUrl(programUrl)) {
    return {
      ...base,
      source: 'unsafe_url',
      autoLine: `— Μη έγκυρο URL προγράμματος · needs_update αμετάβλητο — έλεγχος ${checked}`,
    };
  }

  const external = await checkExternalProgramForWeek(programUrl, now);
  const label = external.weekLabel || weekLabel;
  const linkHasDates = Boolean(external.hasProgram && external.matchedDays > 0);

  if (external.error) {
    return {
      ...base,
      source: 'link_error',
      weekLabel: label,
      autoLine: `— Δεν διαβάστηκε το link (${label}): ${external.error} · έλεγχος με updated — ${checked}`,
    };
  }

  if (linkHasDates && cmsCount === 0) {
    return {
      ...base,
      source: 'link',
      weekLabel: label,
      linkHasDates: true,
      matchedDays: external.matchedDays,
      needsUpdate: true,
      autoLine: `⚠ Πρόγραμμα στο link (${label}): ${external.matchedDays} ημέρες με ημερομηνίες — λείπουν από CMS — έλεγχος ${checked}`,
    };
  }

  if (linkHasDates && cmsCount > 0) {
    return {
      ...base,
      source: 'link',
      weekLabel: label,
      linkHasDates: true,
      matchedDays: external.matchedDays,
      needsUpdate: false,
      autoLine: `✓ Link + CMS (${label}): ${external.matchedDays} ημέρες στο site, ${cmsCount} προβολές στο CMS — έλεγχος ${checked}`,
    };
  }

  if (!linkHasDates && cmsCount > 0) {
    return {
      ...base,
      source: 'link',
      weekLabel: label,
      autoLine: `✓ CMS (${weekLabel}): ${cmsCount} προβολές — στο link δεν εντοπίστηκαν ημερομηνίες (χειροκίνητος έλεγχος) — ${checked}`,
    };
  }

  return {
    ...base,
    source: 'link',
    weekLabel: label,
    autoLine: `— (${label}): στο link δεν εντοπίστηκαν ημερομηνίες · needs_update=false · έλεγχος με updated — ${checked}`,
  };
}

/**
 * Ενημέρωση μόνο needs_update + info_update. Το updated δεν αλλάζει ποτέ από αυτό το script.
 */
async function syncVenueProgramStatus(strapi, venueId, options = {}) {
  const { logChange = false, onlyIfNotUpdated = false, forceAll = false } = options;
  const venue = await strapi.entityService.findOne('api::venue.venue', venueId, {
    fields: ['name', 'type', 'needs_update', 'updated', 'more_link', 'info_update'],
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
  const { weekLabel, cmsCount, autoLine } = evaluation;
  const needsUpdate = evaluation.needsUpdate ?? computeNeedsUpdate(evaluation);
  const hadNeedsUpdate = venue.needs_update !== false;

  const { manual } = splitVenueInfo(venue.info_update);
  const info_update = mergeVenueInfo(autoLine, manual);

  await strapi.entityService.update('api::venue.venue', venueId, {
    data: { needs_update: needsUpdate, info_update },
  });

  if (logChange && hadNeedsUpdate && !needsUpdate) {
    strapi.log.info(`[program] ${venue.name}: OK για ${weekLabel} (${evaluation.source})`);
  }
  if (logChange && !hadNeedsUpdate && needsUpdate) {
    strapi.log.info(
      `[program] ${venue.name}: πρόγραμμα στο link, λείπει από CMS (${weekLabel}, ${evaluation.matchedDays} ημέρες)`,
    );
  }

  return {
    needsUpdate,
    cmsCount,
    weekLabel,
    completed: Boolean(venue.updated),
    source: evaluation.source,
    programUrl: evaluation.programUrl,
    linkHasDates: evaluation.linkHasDates,
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
    `[program] αρχικός sync: ${summary.total} σινεμά, ${summary.ok} OK, ${summary.needsImport} needs_update`,
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
  const summary = { total: venues.length, ok: 0, needsImport: 0, pendingManual: 0 };
  let fetchedLink = false;
  for (const v of venues) {
    if (fetchedLink) await sleep(EXTERNAL_FETCH_GAP_MS);
    const r = await syncVenueProgramStatus(strapi, v.id, { logChange, onlyIfNotUpdated, forceAll });
    if (r.skipped) continue;
    if (r.programUrl) fetchedLink = true;
    if (r.needsUpdate) summary.needsImport += 1;
    else summary.ok += 1;
    if (!r.completed) summary.pendingManual += 1;
  }
  return summary;
}

/** Ασύγχρονος + debounced έλεγχος (cron / κουμπί παραμένουν άμεσα). */
function scheduleVenueProgramSync(strapi, venueId, options = {}) {
  const id = Number(venueId);
  if (!Number.isFinite(id)) return;

  const prev = pendingVenueSyncTimers.get(id);
  if (prev) clearTimeout(prev);

  const timer = setTimeout(() => {
    pendingVenueSyncTimers.delete(id);
    syncVenueProgramStatus(strapi, id, {
      logChange: true,
      onlyIfNotUpdated: true,
      ...options,
    }).catch((err) => {
      strapi.log.warn(`[program] deferred sync venue=${id}:`, err?.message || err);
    });
  }, VENUE_SYNC_DEBOUNCE_MS);

  pendingVenueSyncTimers.set(id, timer);
}

async function scheduleVenueProgramSyncFromShowtime(strapi, showtimeId) {
  const st = await strapi.entityService.findOne('api::showtime.showtime', showtimeId, {
    populate: { venue: { fields: ['id'] } },
    publicationState: 'preview',
  });
  const venueId = st?.venue?.id;
  if (venueId) scheduleVenueProgramSync(strapi, venueId);
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
