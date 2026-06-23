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
  };
}

/**
 * Κατάσταση μετά More sync.
 * - complete: όλες οι προβολές επόμενης εβδομάδας πέρασαν
 * - needs_manual: κάποιες όχι (άγνωστη ταινία, mismatch, μερικό sync)
 * - null: καμία προβολή εβδομάδας στο More — κράτα no_new
 *
 * @returns {VenueUpdatedStatus | null}
 */
function computeVenueUpdatedStatus(stats) {
  const weekExpected = stats.weekExpected || 0;
  const weekSynced = stats.weekSynced || 0;
  const weekFailed = stats.weekFailed || 0;

  if (weekExpected > 0) {
    if (!stats.autoCreated && weekFailed === 0 && weekSynced >= weekExpected) {
      return VENUE_UPDATED_STATUS.COMPLETE;
    }
    return VENUE_UPDATED_STATUS.NEEDS_MANUAL;
  }

  if (
    stats.autoCreated ||
    stats.skippedUnknownEventId > 0 ||
    stats.skippedVenueMismatch > 0 ||
    stats.skippedNoVenue > 0 ||
    stats.errors > 0
  ) {
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

async function applyCinemaVenueUpdatedStatuses(strapi, tracker, { autoCreatedVenueIds = [] } = {}) {
  const autoCreated = new Set(
    (autoCreatedVenueIds || []).map((id) => Number(id)).filter(Number.isFinite),
  );
  const summary = {
    no_new: 0,
    complete: 0,
    needs_manual: 0,
    preserved_complete: 0,
    unchanged_no_new: 0,
    updated: 0,
    venues: [],
  };

  const entries = tracker.entries();
  if (!entries.length) return summary;

  const venueIds = entries.map(([venueId]) => venueId);
  const existingRows = await strapi.entityService.findMany('api::venue.venue', {
    filters: { id: { $in: venueIds } },
    fields: ['id', 'updated'],
    publicationState: 'preview',
    pagination: { pageSize: Math.max(venueIds.length, 1) },
  });
  const currentById = new Map(
    (Array.isArray(existingRows) ? existingRows : []).map((row) => [row.id, row.updated]),
  );

  for (const [venueId, stats] of entries) {
    if (autoCreated.has(venueId)) stats.autoCreated = true;

    const current = currentById.get(venueId);
    if (current === VENUE_UPDATED_STATUS.COMPLETE) {
      summary.preserved_complete += 1;
      summary.complete += 1;
      summary.venues.push({
        venueId,
        status: VENUE_UPDATED_STATUS.COMPLETE,
        statusLabel: VENUE_UPDATED_LABELS.complete,
        preserved: true,
        created: stats.created,
        alreadyExists: stats.alreadyExists,
        skippedUnknownEventId: stats.skippedUnknownEventId,
        weekExpected: stats.weekExpected,
        weekSynced: stats.weekSynced,
        weekFailed: stats.weekFailed,
        autoCreated: stats.autoCreated,
      });
      continue;
    }

    const next = computeVenueUpdatedStatus(stats);
    if (next === null) {
      summary.unchanged_no_new += 1;
      summary.no_new += 1;
      summary.venues.push({
        venueId,
        status: VENUE_UPDATED_STATUS.NO_NEW,
        statusLabel: VENUE_UPDATED_LABELS.no_new,
        preserved: true,
        reason: 'no_upcoming_week_events',
        created: stats.created,
        alreadyExists: stats.alreadyExists,
        weekExpected: stats.weekExpected,
        weekSynced: stats.weekSynced,
        weekFailed: stats.weekFailed,
        autoCreated: stats.autoCreated,
      });
      continue;
    }

    if (next === current) {
      summary[next] += 1;
      summary.venues.push({
        venueId,
        status: next,
        statusLabel: VENUE_UPDATED_LABELS[next],
        preserved: true,
        created: stats.created,
        alreadyExists: stats.alreadyExists,
        skippedUnknownEventId: stats.skippedUnknownEventId,
        weekExpected: stats.weekExpected,
        weekSynced: stats.weekSynced,
        weekFailed: stats.weekFailed,
        autoCreated: stats.autoCreated,
      });
      continue;
    }

    await strapi.entityService.update('api::venue.venue', venueId, {
      data: { updated: next },
    });
    summary[next] += 1;
    summary.updated += 1;
    summary.venues.push({
      venueId,
      status: next,
      statusLabel: VENUE_UPDATED_LABELS[next],
      preserved: false,
      created: stats.created,
      alreadyExists: stats.alreadyExists,
      skippedUnknownEventId: stats.skippedUnknownEventId,
      weekExpected: stats.weekExpected,
      weekSynced: stats.weekSynced,
      weekFailed: stats.weekFailed,
      autoCreated: stats.autoCreated,
    });
  }

  return summary;
}

module.exports = {
  VENUE_UPDATED_STATUS,
  VENUE_UPDATED_LABELS,
  isVenueUpdatedStatus,
  createVenueSyncStatsTracker,
  computeVenueUpdatedStatus,
  migrateVenueUpdatedBooleanToEnum,
  applyCinemaVenueUpdatedStatuses,
};
