'use strict';

const { VENUE_UPDATED_STATUS, VENUE_UPDATED_LABELS } = require('./venue-updated-status');

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

function mapVenueRow(row) {
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
  };
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
  const all = await findAllCinemaVenues(strapi);
  const published = all.filter((row) => row.publishedAt != null);
  const unpublished = all.filter((row) => row.publishedAt == null);

  const noNew = published.filter((row) => row.updated === VENUE_UPDATED_STATUS.NO_NEW);
  const needsManual = published.filter((row) => row.updated === VENUE_UPDATED_STATUS.NEEDS_MANUAL);
  const complete = published.filter((row) => row.updated === VENUE_UPDATED_STATUS.COMPLETE);
  const unpublishedAutoCreated = unpublished.filter((row) => isAutoCreatedFromSync(row.info));
  const unpublishedOther = unpublished.filter((row) => !isAutoCreatedFromSync(row.info));

  return {
    generatedAt: new Date().toISOString(),
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
    noNew: noNew.map(mapVenueRow),
    needsManual: needsManual.map(mapVenueRow),
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
