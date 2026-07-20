'use strict';

/** @typedef {'no_new' | 'complete' | 'needs_manual'} VenueUpdatedStatus */

const {
  getTargetCinemaWeekBoundsForVenueStatus,
  getVenueStatusWeekPhaseLabel,
} = require('../../../utils/cinemaWeek');

const VENUE_UPDATED_STATUS = {
  NO_NEW: 'no_new',
  COMPLETE: 'complete',
  NEEDS_MANUAL: 'needs_manual',
};

const VENUE_UPDATED_LABELS = {
  no_new: 'Χωρίς νέες προβολές εβδομάδας',
  complete: 'Πλήρης ενημέρωση',
  needs_manual: 'Απαιτεί χειροκίνητη δουλειά',
};

const VENUE_TRANSITION_LABELS = {
  became_complete: 'Έγινε πλήρης',
  no_new_to_manual: 'no_new → χειροκίνητα',
  became_manual: 'Έγινε χειροκίνητα',
  complete_to_manual: 'complete → χειροκίνητα',
  still_complete: 'Ήδη πλήρης',
  still_no_new: 'Παρέμεινε no_new',
  still_manual: 'Παρέμεινε χειροκίνητα',
  unchanged: '—',
};

function computeVenueStatusTransition(previous, next, preserved, opts = {}) {
  const { downgradedFromComplete, reason } = opts;
  if (downgradedFromComplete) return 'complete_to_manual';
  if (!preserved && next === VENUE_UPDATED_STATUS.COMPLETE) return 'became_complete';
  if (!preserved && next === VENUE_UPDATED_STATUS.NEEDS_MANUAL) {
    if (previous === VENUE_UPDATED_STATUS.NO_NEW) return 'no_new_to_manual';
    return 'became_manual';
  }
  if (preserved && next === VENUE_UPDATED_STATUS.COMPLETE) return 'still_complete';
  if (preserved && next === VENUE_UPDATED_STATUS.NO_NEW) return 'still_no_new';
  if (preserved && next === VENUE_UPDATED_STATUS.NEEDS_MANUAL) return 'still_manual';
  return 'unchanged';
}

function explainVenueSyncStatusReason(stats, { reason, next } = {}) {
  const parts = [];
  if (stats.autoCreated) parts.push('αυτόματη δημιουργία χώρου από sync');
  if ((stats.skippedNoVenue || 0) > 0) parts.push('χωρίς venue στο CMS');
  if ((stats.errors || 0) > 0) parts.push(`${stats.errors} σφάλμα(τα) sync`);

  const weekExpected = stats.weekExpected || 0;
  const weekSynced = stats.weekSynced || 0;
  const weekFailed = stats.weekFailed || 0;
  const weekUnknown = stats.weekSkippedUnknownEventId || 0;
  const weekMismatch = stats.weekSkippedVenueMismatch || 0;

  if (reason === 'no_upcoming_week_events') {
    if (weekExpected === 0) {
      parts.push(
        `καμία προβολή εβδομάδας-στόχου (${getVenueStatusWeekPhaseLabel()}) στο More/CMS`,
      );
    } else parts.push(`προβολές εβδομάδας: ${weekSynced}/${weekExpected}`);
  } else if (stats.cmsWeekFallback && weekExpected > 0) {
    parts.push(`CMS εβδομάδας-στόχου: ${weekSynced} προβολές (χωρίς More week count)`);
  } else if (weekExpected > 0) {
    if (weekFailed > 0) {
      const detail =
        weekUnknown > 0
          ? `${weekUnknown} άγνωστα eventId`
          : weekMismatch > 0
            ? `${weekMismatch} mismatch venue`
            : null;
      parts.push(
        `προβολές εβδομάδας ${weekSynced}/${weekExpected}, ${weekFailed} αποτυχίες` +
          (detail ? ` (${detail})` : ''),
      );
    } else if (weekSynced < weekExpected) {
      parts.push(`μερικό sync: ${weekSynced}/${weekExpected}`);
    } else if (next === VENUE_UPDATED_STATUS.COMPLETE) {
      parts.push(`πλήρες sync (${weekSynced}/${weekExpected})`);
    }
  }

  if (reason === 'program_import_partial') {
    if (weekExpected > 0) {
      parts.push(`εισαγωγή κειμένου: ${weekSynced}/${weekExpected} προβολές εβδομάδας`);
    }
    if ((stats.unmatchedMovies || 0) > 0) {
      parts.push(`${stats.unmatchedMovies} ταινίες χωρίς ταύτιση CMS`);
    }
  } else if (reason === 'program_import_complete' && weekExpected > 0) {
    parts.push(`πλήρης εισαγωγή κειμένου (${weekSynced}/${weekExpected})`);
  }

  if ((stats.created || 0) > 0) parts.push(`+${stats.created} νέες προβολές`);
  return parts.join(' · ') || '—';
}

function buildVenueStatusEntry({
  venueId,
  venueName,
  previousStatus,
  status,
  preserved,
  stats,
  reason,
  downgradedFromComplete = false,
}) {
  const transition = computeVenueStatusTransition(previousStatus, status, preserved, {
    downgradedFromComplete,
    reason,
  });
  return {
    venueId,
    venueName: venueName || `Χώρος #${venueId}`,
    previousStatus: previousStatus || null,
    previousStatusLabel: previousStatus ? VENUE_UPDATED_LABELS[previousStatus] : null,
    status,
    statusLabel: VENUE_UPDATED_LABELS[status],
    transition,
    transitionLabel: VENUE_TRANSITION_LABELS[transition] || transition,
    preserved: Boolean(preserved),
    downgradedFromComplete: Boolean(downgradedFromComplete),
    reason: reason || null,
    reasonDetail: explainVenueSyncStatusReason(stats, { reason, next: status }),
    created: stats.created,
    alreadyExists: stats.alreadyExists,
    skippedUnknownEventId: stats.skippedUnknownEventId,
    skippedVenueMismatch: stats.skippedVenueMismatch,
    weekSkippedUnknownEventId: stats.weekSkippedUnknownEventId,
    weekSkippedVenueMismatch: stats.weekSkippedVenueMismatch,
    weekExpected: stats.weekExpected,
    weekSynced: stats.weekSynced,
    weekFailed: stats.weekFailed,
    autoCreated: stats.autoCreated,
  };
}

function isVenueUpdatedStatus(value) {
  return (
    value === VENUE_UPDATED_STATUS.NO_NEW ||
    value === VENUE_UPDATED_STATUS.COMPLETE ||
    value === VENUE_UPDATED_STATUS.NEEDS_MANUAL
  );
}

function createVenueSyncStatsTracker() {
  const byVenueId = new Map();

  const ensure = (venueId) => {
    const id = Number(venueId);
    if (!Number.isFinite(id)) return null;
    if (!byVenueId.has(id)) {
      byVenueId.set(id, {
        venueId: id,
        created: 0,
        alreadyExists: 0,
        skippedUnknownEventId: 0,
        skippedVenueMismatch: 0,
        skippedNoVenue: 0,
        errors: 0,
        autoCreated: false,
        weekExpected: 0,
        weekSynced: 0,
        weekFailed: 0,
        weekSkippedUnknownEventId: 0,
        weekSkippedVenueMismatch: 0,
      });
    }
    return byVenueId.get(id);
  };

  return {
    touch(venueId) {
      return ensure(venueId);
    },
    record(venueId, patch = {}) {
      const stats = ensure(venueId);
      if (!stats) return null;
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'autoCreated' && value === true) {
          stats.autoCreated = true;
          continue;
        }
        if (typeof stats[key] === 'number' && typeof value === 'number') {
          stats[key] += value;
        }
      }
      return stats;
    },
    /** Προβολή επόμενης εβδομάδας κινηματογράφου — για updated status. */
    recordWeekEvent(venueId, outcome) {
      if (!outcome) return ensure(venueId);
      const stats = ensure(venueId);
      if (!stats) return null;
      stats.weekExpected += 1;
      if (outcome === 'synced') stats.weekSynced += 1;
      else if (outcome === 'failed') stats.weekFailed += 1;
      return stats;
    },
    markAutoCreated(venueId) {
      const stats = ensure(venueId);
      if (stats) stats.autoCreated = true;
      return stats;
    },
    recordUpsertResult(venueId, result) {
      if (result === 'created') return this.record(venueId, { created: 1 });
      if (result === 'exists') return this.record(venueId, { alreadyExists: 1 });
      return ensure(venueId);
    },
    entries() {
      return [...byVenueId.entries()];
    },
    /** Συγχώνευση στατιστικών από άλλο tracker (π.χ. batches ταινιών + bundles). */
    mergeFrom(other) {
      if (!other?.entries) return this;
      for (const [venueId, s] of other.entries()) {
        this.record(venueId, {
          created: s.created || 0,
          alreadyExists: s.alreadyExists || 0,
          skippedUnknownEventId: s.skippedUnknownEventId || 0,
          skippedVenueMismatch: s.skippedVenueMismatch || 0,
          skippedNoVenue: s.skippedNoVenue || 0,
          errors: s.errors || 0,
          weekExpected: s.weekExpected || 0,
          weekSynced: s.weekSynced || 0,
          weekFailed: s.weekFailed || 0,
          weekSkippedUnknownEventId: s.weekSkippedUnknownEventId || 0,
          weekSkippedVenueMismatch: s.weekSkippedVenueMismatch || 0,
        });
        if (s.autoCreated) this.markAutoCreated(venueId);
      }
      return this;
    },
  };
}

/** Σφάλματα sync που απαιτούν χειροκίνητο έλεγχο — ανεξάρτητα από εβδομάδα-στόχο. */
function venueHasManualSyncIssues(stats) {
  return (
    stats.autoCreated ||
    (stats.skippedNoVenue || 0) > 0 ||
    (stats.errors || 0) > 0
  );
}

/**
 * Κατάσταση μετά More sync.
 * - complete: όλες οι προβολές της εβδομάδας-στόχου (Πέμπτη→Τετάρτη) πέρασαν
 * - needs_manual: κάποιες όχι (άγνωστη ταινία, mismatch, μερικό sync)
 * - null: καμία προβολή εβδομάδας-στόχου στο More/CMS
 *
 * @returns {VenueUpdatedStatus | null}
 */
function computeVenueUpdatedStatus(stats, now = new Date()) {
  if (venueHasManualSyncIssues(stats)) {
    return VENUE_UPDATED_STATUS.NEEDS_MANUAL;
  }

  const weekExpected = stats.weekExpected || 0;
  const weekSynced = stats.weekSynced || 0;
  const weekFailed = stats.weekFailed || 0;

  if (weekExpected > 0) {
    const allWeekSynced = weekFailed === 0 && weekSynced >= weekExpected;
    if (allWeekSynced) return VENUE_UPDATED_STATUS.COMPLETE;
    return VENUE_UPDATED_STATUS.NEEDS_MANUAL;
  }

  return null;
}

/**
 * Όταν το More δεν μέτρησε εβδομάδα-στόχο (weekExpected=0), κοίτα πραγματικές
 * προβολές στο CMS για την ίδια εβδομάδα — αλλιώς μένουν λάθος «no_new».
 */
async function enrichTrackerWeekStatsFromCmsShowtimes(strapi, tracker, now = new Date()) {
  if (!tracker?.entries) return { enriched: 0 };
  const { start, end } = getTargetCinemaWeekBoundsForVenueStatus(now);
  const rangeStart = new Date(Math.max(start.getTime(), now.getTime()));
  let enriched = 0;

  for (const [venueId, stats] of tracker.entries()) {
    if ((stats.weekExpected || 0) > 0) continue;

    const rows = await strapi.entityService.findMany('api::showtime.showtime', {
      filters: {
        venue: { id: venueId },
        datetime: {
          $gte: rangeStart.toISOString(),
          $lte: end.toISOString(),
        },
      },
      fields: ['id'],
      pagination: { pageSize: 200 },
    });
    const count = Array.isArray(rows) ? rows.length : 0;
    if (count <= 0) continue;

    stats.weekExpected = count;
    stats.weekSynced = count;
    stats.weekFailed = 0;
    stats.cmsWeekFallback = true;
    enriched += 1;
  }

  return { enriched, weekPhase: getVenueStatusWeekPhaseLabel(now), rangeStart, end };
}

async function migrateVenueUpdatedBooleanToEnum(strapi) {
  const rows = await strapi.entityService.findMany('api::venue.venue', {
    filters: { type: 'cinema' },
    fields: ['id', 'updated'],
    publicationState: 'preview',
    pagination: { pageSize: 500 },
  });
  let migrated = 0;
  for (const row of rows) {
    if (isVenueUpdatedStatus(row.updated)) continue;
    const next =
      row.updated === true || row.updated === 'true'
        ? VENUE_UPDATED_STATUS.COMPLETE
        : VENUE_UPDATED_STATUS.NO_NEW;
    await strapi.entityService.update('api::venue.venue', row.id, {
      data: { updated: next },
    });
    migrated += 1;
  }
  if (migrated > 0) {
    strapi.log.info(`[whatson] venue.updated enum migration: ${migrated} σινεμά`);
  }
  return migrated;
}

async function applyCinemaVenueUpdatedStatuses(
  strapi,
  tracker,
  { autoCreatedVenueIds = [], ensureVenueIds = [], now = new Date() } = {},
) {
  const autoCreated = new Set(
    (autoCreatedVenueIds || []).map((id) => Number(id)).filter(Number.isFinite),
  );
  for (const venueId of ensureVenueIds || []) {
    tracker.touch(venueId);
  }

  const cmsEnrich = await enrichTrackerWeekStatsFromCmsShowtimes(strapi, tracker, now);

  const summary = {
    no_new: 0,
    complete: 0,
    needs_manual: 0,
    preserved_complete: 0,
    unchanged_no_new: 0,
    became_complete: 0,
    became_manual: 0,
    no_new_to_manual: 0,
    complete_to_manual: 0,
    updated: 0,
    cmsWeekEnriched: cmsEnrich.enriched || 0,
    weekPhase: cmsEnrich.weekPhase || getVenueStatusWeekPhaseLabel(now),
    venues: [],
  };

  const entries = tracker.entries();
  if (!entries.length) return summary;

  const venueIds = entries.map(([venueId]) => venueId);
  const existingRows = await strapi.entityService.findMany('api::venue.venue', {
    filters: { id: { $in: venueIds } },
    fields: ['id', 'name', 'updated'],
    publicationState: 'preview',
    pagination: { pageSize: Math.max(venueIds.length, 1) },
  });
  const currentById = new Map(
    (Array.isArray(existingRows) ? existingRows : []).map((row) => [row.id, row.updated]),
  );
  const nameById = new Map(
    (Array.isArray(existingRows) ? existingRows : []).map((row) => [row.id, row.name]),
  );

  const pushVenue = (entry) => {
    summary.venues.push(entry);
    if (entry.transition === 'became_complete') summary.became_complete += 1;
    if (entry.transition === 'became_manual') summary.became_manual += 1;
    if (entry.transition === 'no_new_to_manual') summary.no_new_to_manual += 1;
    if (entry.transition === 'complete_to_manual') summary.complete_to_manual += 1;
  };

  for (const [venueId, stats] of entries) {
    if (autoCreated.has(venueId)) stats.autoCreated = true;

    const current = currentById.get(venueId);
    const normalizedCurrent = isVenueUpdatedStatus(current)
      ? current
      : VENUE_UPDATED_STATUS.NO_NEW;
    const next = computeVenueUpdatedStatus(stats, now);

    // Καμία προβολή εβδομάδας στο More αυτό το run — μην κρατάς «complete» από παλιό sync.
    if (next === null) {
      const reason = 'no_upcoming_week_events';
      const effectiveStatus =
        normalizedCurrent === VENUE_UPDATED_STATUS.COMPLETE
          ? VENUE_UPDATED_STATUS.NO_NEW
          : normalizedCurrent;
      const needsWrite = effectiveStatus !== normalizedCurrent;

      if (needsWrite) {
        await strapi.entityService.update('api::venue.venue', venueId, {
          data: { updated: effectiveStatus },
        });
        summary.updated += 1;
      } else if (effectiveStatus === VENUE_UPDATED_STATUS.NO_NEW) {
        summary.unchanged_no_new += 1;
      }

      summary[effectiveStatus] = (summary[effectiveStatus] || 0) + 1;
      pushVenue(
        buildVenueStatusEntry({
          venueId,
          venueName: nameById.get(venueId),
          previousStatus: current,
          status: effectiveStatus,
          preserved: !needsWrite,
          stats,
          reason,
        }),
      );
      continue;
    }

    // Πραγματικά πλήρες αυτό το run — OK να μείνει complete χωρίς άλλη εγγραφή.
    if (
      next === VENUE_UPDATED_STATUS.COMPLETE &&
      normalizedCurrent === VENUE_UPDATED_STATUS.COMPLETE
    ) {
      summary.preserved_complete += 1;
      summary.complete += 1;
      pushVenue(
        buildVenueStatusEntry({
          venueId,
          venueName: nameById.get(venueId),
          previousStatus: current,
          status: VENUE_UPDATED_STATUS.COMPLETE,
          preserved: true,
          stats,
          reason: 'sync_complete',
        }),
      );
      continue;
    }

    if (
      normalizedCurrent === VENUE_UPDATED_STATUS.COMPLETE &&
      next === VENUE_UPDATED_STATUS.NEEDS_MANUAL
    ) {
      await strapi.entityService.update('api::venue.venue', venueId, {
        data: { updated: VENUE_UPDATED_STATUS.NEEDS_MANUAL },
      });
      summary.needs_manual += 1;
      summary.updated += 1;
      pushVenue(
        buildVenueStatusEntry({
          venueId,
          venueName: nameById.get(venueId),
          previousStatus: current,
          status: VENUE_UPDATED_STATUS.NEEDS_MANUAL,
          preserved: false,
          stats,
          reason: 'unknown_event_or_sync_issue',
          downgradedFromComplete: true,
        }),
      );
      continue;
    }

    if (next === normalizedCurrent) {
      summary[next] += 1;
      pushVenue(
        buildVenueStatusEntry({
          venueId,
          venueName: nameById.get(venueId),
          previousStatus: current,
          status: next,
          preserved: true,
          stats,
        }),
      );
      continue;
    }

    await strapi.entityService.update('api::venue.venue', venueId, {
      data: { updated: next },
    });
    summary[next] += 1;
    summary.updated += 1;
    pushVenue(
      buildVenueStatusEntry({
        venueId,
        venueName: nameById.get(venueId),
        previousStatus: current,
        status: next,
        preserved: false,
        stats,
      }),
    );
  }

  return summary;
}

/**
 * Ενημέρωση venue.updated μετά εισαγωγή προγράμματος (ελεύθερο κείμενο).
 * Βασίζεται στην εβδομάδα-στόχο (ερχόμενη Πέμπτη→Τετάρτη).
 */
async function applyVenueUpdatedStatusFromProgramImport(
  strapi,
  venueId,
  stats,
  { importMeta = {}, now = new Date() } = {},
) {
  const id = Number(venueId);
  if (!Number.isFinite(id)) return null;

  const venue = await strapi.entityService.findOne('api::venue.venue', id, {
    fields: ['id', 'name', 'type', 'updated'],
    publicationState: 'preview',
  });
  if (!venue || venue.type !== 'cinema') return null;

  const mergedStats = {
    ...stats,
    unmatchedMovies: Number(importMeta.unmatchedMovies || 0),
  };

  let next = computeVenueUpdatedStatus(mergedStats, now);
  if (mergedStats.unmatchedMovies > 0) {
    next = VENUE_UPDATED_STATUS.NEEDS_MANUAL;
  }

  const current = isVenueUpdatedStatus(venue.updated) ? venue.updated : VENUE_UPDATED_STATUS.NO_NEW;
  const weekExpected = mergedStats.weekExpected || 0;

  if (!next) {
    return {
      venueId: id,
      venueName: venue.name,
      previousStatus: current,
      status: current,
      updated: false,
      preserved: true,
      reason: weekExpected > 0 ? 'program_import_outside_target_week' : 'no_target_week_showtimes',
      reasonDetail: explainVenueSyncStatusReason(mergedStats, {
        reason: 'no_upcoming_week_events',
        next: current,
      }),
    };
  }

  if (current === VENUE_UPDATED_STATUS.COMPLETE && next === VENUE_UPDATED_STATUS.COMPLETE) {
    return {
      venueId: id,
      venueName: venue.name,
      previousStatus: current,
      status: VENUE_UPDATED_STATUS.COMPLETE,
      updated: false,
      preserved: true,
      transition: 'still_complete',
      transitionLabel: VENUE_TRANSITION_LABELS.still_complete,
      reason: 'program_import_complete',
      reasonDetail: explainVenueSyncStatusReason(mergedStats, {
        reason: 'program_import_complete',
        next: VENUE_UPDATED_STATUS.COMPLETE,
      }),
    };
  }

  const reason =
    next === VENUE_UPDATED_STATUS.COMPLETE ? 'program_import_complete' : 'program_import_partial';

  if (next === current) {
    return {
      venueId: id,
      venueName: venue.name,
      previousStatus: current,
      status: current,
      updated: false,
      preserved: true,
      transition: current === VENUE_UPDATED_STATUS.COMPLETE ? 'still_complete' : 'still_manual',
      transitionLabel:
        VENUE_TRANSITION_LABELS[
          current === VENUE_UPDATED_STATUS.COMPLETE ? 'still_complete' : 'still_manual'
        ],
      reason,
      reasonDetail: explainVenueSyncStatusReason(mergedStats, { reason, next }),
    };
  }

  await strapi.entityService.update('api::venue.venue', id, {
    data: { updated: next },
  });

  const entry = buildVenueStatusEntry({
    venueId: id,
    venueName: venue.name,
    previousStatus: current,
    status: next,
    preserved: false,
    stats: mergedStats,
    reason,
    downgradedFromComplete:
      current === VENUE_UPDATED_STATUS.COMPLETE && next === VENUE_UPDATED_STATUS.NEEDS_MANUAL,
  });

  return {
    ...entry,
    updated: true,
  };
}

module.exports = {
  VENUE_UPDATED_STATUS,
  VENUE_UPDATED_LABELS,
  VENUE_TRANSITION_LABELS,
  isVenueUpdatedStatus,
  createVenueSyncStatsTracker,
  computeVenueUpdatedStatus,
  enrichTrackerWeekStatsFromCmsShowtimes,
  migrateVenueUpdatedBooleanToEnum,
  applyCinemaVenueUpdatedStatuses,
  applyVenueUpdatedStatusFromProgramImport,
};
