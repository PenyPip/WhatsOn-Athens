'use strict';

/** @typedef {'no_new' | 'complete' | 'needs_manual'} VenueUpdatedStatus */

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
  if ((stats.skippedUnknownEventId || 0) > 0) {
    parts.push(`${stats.skippedUnknownEventId} άγνωστα eventId`);
  }
  if ((stats.skippedVenueMismatch || 0) > 0) {
    parts.push(`${stats.skippedVenueMismatch} mismatch venue`);
  }
  if ((stats.skippedNoVenue || 0) > 0) parts.push('χωρίς venue στο CMS');
  if ((stats.errors || 0) > 0) parts.push(`${stats.errors} σφάλμα(τα) sync`);

  const weekExpected = stats.weekExpected || 0;
  const weekSynced = stats.weekSynced || 0;
  const weekFailed = stats.weekFailed || 0;

  if (reason === 'no_upcoming_week_events') {
    if (weekExpected === 0) parts.push('καμία προβολή εβδομάδας στο More');
    else parts.push(`προβολές εβδομάδας: ${weekSynced}/${weekExpected}`);
  } else if (weekExpected > 0) {
    if (weekFailed > 0) {
      parts.push(`προβολές εβδομάδας ${weekSynced}/${weekExpected}, ${weekFailed} αποτυχίες`);
    } else if (weekSynced < weekExpected) {
      parts.push(`μερικό sync: ${weekSynced}/${weekExpected}`);
    } else if (next === VENUE_UPDATED_STATUS.COMPLETE) {
      parts.push(`πλήρες sync (${weekSynced}/${weekExpected})`);
    }
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
        });
        if (s.autoCreated) this.markAutoCreated(venueId);
      }
      return this;
    },
  };
}

/** Σφάλματα/παραλείψεις που απαιτούν χειροκίνητο έλεγχο — ποτέ complete. */
function venueHasManualSyncIssues(stats) {
  return (
    stats.autoCreated ||
    (stats.skippedUnknownEventId || 0) > 0 ||
    (stats.skippedVenueMismatch || 0) > 0 ||
    (stats.skippedNoVenue || 0) > 0 ||
    (stats.errors || 0) > 0
  );
}

/**
 * Κατάσταση μετά More sync.
 * - complete: όλες οι προβολές της ερχόμενης εβδομάδας (Πέμπτη→Τετάρτη) πέρασαν
 * - needs_manual: κάποιες όχι (άγνωστη ταινία, mismatch, μερικό sync)
 * - null: καμία προβολή εβδομάδας στο More — κράτα no_new
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
  { autoCreatedVenueIds = [], now = new Date() } = {},
) {
  const autoCreated = new Set(
    (autoCreatedVenueIds || []).map((id) => Number(id)).filter(Number.isFinite),
  );
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
    const next = computeVenueUpdatedStatus(stats, now);

    if (current === VENUE_UPDATED_STATUS.COMPLETE && next !== VENUE_UPDATED_STATUS.NEEDS_MANUAL) {
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
        }),
      );
      continue;
    }

    if (current === VENUE_UPDATED_STATUS.COMPLETE && next === VENUE_UPDATED_STATUS.NEEDS_MANUAL) {
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
    if (next === null) {
      const reason = 'no_upcoming_week_events';
      summary.unchanged_no_new += 1;
      summary.no_new += 1;
      pushVenue(
        buildVenueStatusEntry({
          venueId,
          venueName: nameById.get(venueId),
          previousStatus: current,
          status: VENUE_UPDATED_STATUS.NO_NEW,
          preserved: true,
          stats,
          reason,
        }),
      );
      continue;
    }

    if (next === current) {
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

module.exports = {
  VENUE_UPDATED_STATUS,
  VENUE_UPDATED_LABELS,
  VENUE_TRANSITION_LABELS,
  isVenueUpdatedStatus,
  createVenueSyncStatsTracker,
  computeVenueUpdatedStatus,
  migrateVenueUpdatedBooleanToEnum,
  applyCinemaVenueUpdatedStatuses,
};
