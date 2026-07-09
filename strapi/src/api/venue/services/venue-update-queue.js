'use strict';

const { VENUE_UPDATED_STATUS, VENUE_UPDATED_LABELS } = require('./venue-updated-status');
const {
  getTargetCinemaWeekBoundsForVenueStatus,
  getVenueStatusWeekPhaseLabel,
  showtimeOverlapsRange,
  formatWeekLabel,
} = require('../../../utils/cinemaWeek');

const AUTO_CREATE_INFO_MARKERS = [
  'Αυτόματη δημιουργία από More cinema sync.',
  'Αυτόματη δημιουργία από More theater sync.',
];

function isAutoCreatedFromSync(info) {
  const text = String(info || '').trim();
  return AUTO_CREATE_INFO_MARKERS.some((marker) => text.includes(marker));
}

function venueHasBundleCodes(row) {
  if (String(row?.event_group_code || '').trim()) return true;
  const groups = row?.more_event_groups;
  if (!Array.isArray(groups)) return false;
  return groups.some((group) => String(group?.code || '').trim());
}

function mapVenueRow(row, extra = {}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    updated: row.updated,
    updatedLabel: VENUE_UPDATED_LABELS[row.updated] || row.updated || '—',
    published: row.publishedAt != null,
    autoCreatedFromSync: isAutoCreatedFromSync(row.info),
    hasBundle: venueHasBundleCodes(row),
    venueId: row.venue_id || null,
    ...extra,
  };
}

function explainNoNewListing({ showtimesInTargetWeek, hasBundle }) {
  if (showtimesInTargetWeek > 0) {
    return 'Έχει προβολές στην εβδομάδα-στόχο αλλά updated=no_new — τρέξε More sync για να γίνει complete';
  }
  if (!hasBundle) {
    return 'Χωρίς bundle codes — το sync δεν ενημερώνει αυτόματα το πεδίο updated';
  }
  return 'Δεν υπάρχουν ακόμα προβολές στην επόμενη κινηματογραφική εβδομάδα (Πέμ→Τετ)';
}

async function countShowtimesInTargetWeek(strapi, venueId, now = new Date()) {
  const { start, end } = getTargetCinemaWeekBoundsForVenueStatus(now);
  const rows = await strapi.entityService.findMany('api::showtime.showtime', {
    filters: { venue: venueId },
    fields: ['datetime', 'schedule_kind', 'week_end'],
    pagination: { pageSize: 500 },
  });
  let count = 0;
  for (const st of rows || []) {
    if (showtimeOverlapsRange(st, start, end, now)) count += 1;
  }
  return count;
}

async function findAllCinemaVenues(strapi, filters = {}) {
  const all = [];
  for (let page = 1; ; page += 1) {
    const rows = await strapi.entityService.findMany('api::venue.venue', {
      filters: { type: 'cinema', ...filters },
      fields: [
        'id',
        'name',
        'slug',
        'updated',
        'publishedAt',
        'info',
        'event_group_code',
        'venue_id',
      ],
      populate: { more_event_groups: { fields: ['code'] } },
      publicationState: 'preview',
      sort: { name: 'asc' },
      pagination: { page, pageSize: 100 },
    });
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) break;
    all.push(...list);
    if (list.length < 100) break;
  }
  return all;
}

async function getUpdateQueues(strapi) {
  const now = new Date();
  const { start, end } = getTargetCinemaWeekBoundsForVenueStatus(now);
  const targetWeekLabel = formatWeekLabel(start, end);

  const all = await findAllCinemaVenues(strapi);
  const published = all.filter((row) => row.publishedAt != null);
  const unpublished = all.filter((row) => row.publishedAt == null);

  const noNew = published.filter((row) => row.updated === VENUE_UPDATED_STATUS.NO_NEW);
  const needsManual = published.filter((row) => row.updated === VENUE_UPDATED_STATUS.NEEDS_MANUAL);
  const complete = published.filter((row) => row.updated === VENUE_UPDATED_STATUS.COMPLETE);
  const unpublishedAutoCreated = unpublished.filter((row) => isAutoCreatedFromSync(row.info));
  const unpublishedOther = unpublished.filter((row) => !isAutoCreatedFromSync(row.info));

  const noNewWithDiagnostics = [];
  for (const row of noNew) {
    const showtimesInTargetWeek = await countShowtimesInTargetWeek(strapi, row.id, now);
    noNewWithDiagnostics.push(
      mapVenueRow(row, {
        showtimesInTargetWeek,
        noNewHint: explainNoNewListing({
          showtimesInTargetWeek,
          hasBundle: venueHasBundleCodes(row),
        }),
      }),
    );
  }

  return {
    generatedAt: now.toISOString(),
    targetWeekLabel,
    targetWeekPhase: getVenueStatusWeekPhaseLabel(now),
    counts: {
      noNew: noNew.length,
      needsManual: needsManual.length,
      complete: complete.length,
      unpublished: unpublished.length,
      unpublishedAutoCreated: unpublishedAutoCreated.length,
      unpublishedOther: unpublishedOther.length,
      publishedTotal: published.length,
      cinemaTotal: all.length,
    },
    noNew: noNewWithDiagnostics,
    needsManual: needsManual.map((row) => mapVenueRow(row)),
    complete: complete.map(mapVenueRow),
    unpublished: unpublished.map(mapVenueRow),
    unpublishedAutoCreated: unpublishedAutoCreated.map(mapVenueRow),
    unpublishedOther: unpublishedOther.map(mapVenueRow),
  };
}

module.exports = {
  AUTO_CREATE_INFO_MARKERS,
  isAutoCreatedFromSync,
  getUpdateQueues,
};
