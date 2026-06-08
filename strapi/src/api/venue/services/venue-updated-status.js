'use strict';

/** @typedef {'no_new' | 'complete' | 'needs_manual'} VenueUpdatedStatus */

const VENUE_UPDATED_STATUS = {
  NO_NEW: 'no_new',
  COMPLETE: 'complete',
  NEEDS_MANUAL: 'needs_manual',
};

const VENUE_UPDATED_LABELS = {
  no_new: 'Χωρίς καινούργια',
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
 * @param {ReturnType<createVenueSyncStatsTracker>['entries'] extends () => infer T ? T[number][1] : never} stats
 * @returns {VenueUpdatedStatus}
 */
function computeVenueUpdatedStatus(stats) {
  const needsManual =
    stats.autoCreated ||
    stats.skippedUnknownEventId > 0 ||
    stats.skippedVenueMismatch > 0 ||
    stats.skippedNoVenue > 0 ||
    stats.errors > 0;

  if (stats.created > 0) {
    return needsManual ? VENUE_UPDATED_STATUS.NEEDS_MANUAL : VENUE_UPDATED_STATUS.COMPLETE;
  }
  if (needsManual) return VENUE_UPDATED_STATUS.NEEDS_MANUAL;
  return VENUE_UPDATED_STATUS.NO_NEW;
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
    updated: 0,
    venues: [],
  };

  for (const [venueId, stats] of tracker.entries()) {
    if (autoCreated.has(venueId)) stats.autoCreated = true;
    const status = computeVenueUpdatedStatus(stats);
    await strapi.entityService.update('api::venue.venue', venueId, {
      data: { updated: status },
    });
    summary[status] += 1;
    summary.updated += 1;
    summary.venues.push({
      venueId,
      status,
      statusLabel: VENUE_UPDATED_LABELS[status],
      created: stats.created,
      alreadyExists: stats.alreadyExists,
      skippedUnknownEventId: stats.skippedUnknownEventId,
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
