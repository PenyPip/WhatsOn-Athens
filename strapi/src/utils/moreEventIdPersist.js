'use strict';

const MAX_EVENT_IDS_PER_ENTRY = Number(process.env.MORE_EVENT_ID_CACHE_MAX || 120);
const MIN_SCORE_TO_PERSIST = Number(process.env.MORE_EVENT_ID_PERSIST_MIN_SCORE || 0.85);

function normalizeEventId(raw) {
  return String(raw ?? '').trim();
}

function createEventIdPersistQueue() {
  /** @type {Map<string, { uid: string, cmsId: number, contentKind: 'movie'|'theater_show', eventId: string, moreVenueId: string, playTitle: string, matchScore: number }>} */
  const pending = new Map();
  return {
    queue({ contentKind, cmsId, eventId, moreVenueId, playTitle, matchScore }) {
      const id = normalizeEventId(eventId);
      const cms = Number(cmsId);
      if (!id || !Number.isFinite(cms)) return;
      const score = Number(matchScore);
      if (Number.isFinite(score) && score < MIN_SCORE_TO_PERSIST) return;
      const uid = `${contentKind}:${cms}:${id}`;
      const existing = pending.get(uid);
      const next = {
        uid,
        cmsId: cms,
        contentKind,
        eventId: id,
        moreVenueId: String(moreVenueId ?? existing?.moreVenueId ?? '').trim(),
        playTitle: String(playTitle ?? existing?.playTitle ?? '').trim(),
        matchScore: Number.isFinite(score) ? score : existing?.matchScore ?? 1,
      };
      pending.set(uid, next);
    },
    size() {
      return pending.size;
    },
    entries() {
      return [...pending.values()];
    },
    clear() {
      pending.clear();
    },
  };
}

function mergePersistedMovieRowsIntoIndex(rows, index) {
  let added = 0;
  for (const movie of rows || []) {
    const cached = movie.more_event_ids ?? movie.moreEventIds ?? [];
    for (const row of cached) {
      const eventId = normalizeEventId(row.event_id ?? row.eventId);
      if (!eventId || index.has(eventId)) continue;
      index.set(eventId, {
        movieId: movie.id,
        movieTitle: movie.title,
        viaPersisted: true,
      });
      added += 1;
    }
  }
  return added;
}

function mergePersistedTheaterRowsIntoIndex(rows, index) {
  let added = 0;
  for (const show of rows || []) {
    const cached = show.more_event_ids ?? show.moreEventIds ?? [];
    for (const row of cached) {
      const eventId = normalizeEventId(row.event_id ?? row.eventId);
      if (!eventId || index.has(eventId)) continue;
      index.set(eventId, {
        theaterShowId: show.id,
        showTitle: show.title,
        viaPersisted: true,
      });
      added += 1;
    }
  }
  return added;
}

async function queryEntityIdsWithPersistedEventIdsKnex(strapi, {
  entityTable,
  linkTable,
  componentTable,
  componentField = 'more_event_ids',
}) {
  const knex = strapi.db.connection;
  const hasLink = await knex.schema.hasTable(linkTable);
  const hasComponent = await knex.schema.hasTable(componentTable);
  if (!hasLink || !hasComponent) return [];

  const rows = await knex(`${linkTable} as mc`)
    .join(`${componentTable} as e`, 'mc.component_id', 'e.id')
    .where('mc.field', componentField)
    .whereNotNull('e.event_id')
    .where('e.event_id', '!=', '')
    .distinct(knex.ref('mc.entity_id').as('id'));

  return [...rows.map((r) => r.id).filter((id) => id != null)].sort((a, b) => Number(a) - Number(b));
}

async function loadEntitiesWithPersistedEventIds(strapi, uid, entityTable, linkTable) {
  const ids = await queryEntityIdsWithPersistedEventIdsKnex(strapi, {
    entityTable,
    linkTable,
    componentTable: 'components_cinema_more_event_ids',
    componentField: 'more_event_ids',
  });
  if (!ids.length) return [];

  const rows = [];
  const pageSize = 80;
  for (let start = 0; start < ids.length; start += pageSize) {
    const slice = ids.slice(start, start + pageSize);
    const batch = await strapi.entityService.findMany(uid, {
      filters: { id: { $in: slice } },
      fields: ['id', 'title'],
      populate: { more_event_ids: true },
      publicationState: 'preview',
      pagination: { start: 0, limit: slice.length },
    });
    if (Array.isArray(batch)) rows.push(...batch);
  }
  return rows;
}

async function loadPersistedCinemaEventIdsIntoIndex(strapi, index, onProgress) {
  if (!index) return 0;
  const rows = await loadEntitiesWithPersistedEventIds(
    strapi,
    'api::movie.movie',
    'movies',
    'movies_components',
  );
  const added = mergePersistedMovieRowsIntoIndex(rows, index);
  if (added > 0 && typeof onProgress === 'function') {
    onProgress(`Ευρετήριο eventId: +${added} από cache eventId ταινιών`);
  }
  return added;
}

async function loadPersistedTheaterEventIdsIntoIndex(strapi, index, onProgress) {
  if (!index) return 0;
  const rows = await loadEntitiesWithPersistedEventIds(
    strapi,
    'api::theater-show.theater-show',
    'theater_shows',
    'theater_shows_components',
  );
  const added = mergePersistedTheaterRowsIntoIndex(rows, index);
  if (added > 0 && typeof onProgress === 'function') {
    onProgress(`Ευρετήριο eventId: +${added} από cache eventId παραστάσεων`);
  }
  return added;
}

function queueScrapeMappingForPersist(queue, contentKind, cmsId, eventId, mapped, event) {
  if (!queue || !mapped?.viaScrape) return;
  queue.queue({
    contentKind,
    cmsId,
    eventId,
    moreVenueId: event?.venueId,
    playTitle: mapped.playTitle,
    matchScore: mapped.matchScore,
  });
}

function mergeEventIdRows(existing, incoming) {
  const byId = new Map();
  for (const row of existing || []) {
    const eventId = normalizeEventId(row.event_id ?? row.eventId);
    if (eventId) byId.set(eventId, row);
  }
  const nowIso = new Date().toISOString();
  for (const item of incoming || []) {
    const eventId = normalizeEventId(item.eventId);
    if (!eventId) continue;
    byId.set(eventId, {
      event_id: eventId,
      more_venue_id: item.moreVenueId || '',
      play_title: item.playTitle || '',
      linked_at: nowIso,
    });
  }
  const merged = [...byId.values()];
  if (merged.length <= MAX_EVENT_IDS_PER_ENTRY) return merged;
  return merged
    .sort((a, b) => String(a.linked_at || '').localeCompare(String(b.linked_at || '')))
    .slice(-MAX_EVENT_IDS_PER_ENTRY);
}

async function flushEventIdPersistQueue(strapi, queue, { onProgress } = {}) {
  if (!queue?.size?.()) return { persisted: 0, entries: 0 };

  const grouped = new Map();
  for (const item of queue.entries()) {
    const key = `${item.contentKind}:${item.cmsId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        contentKind: item.contentKind,
        cmsId: item.cmsId,
        items: [],
      });
    }
    grouped.get(key).items.push(item);
  }

  let persisted = 0;
  let entries = 0;

  for (const { contentKind, cmsId, items } of grouped.values()) {
    const uid =
      contentKind === 'theater_show' ? 'api::theater-show.theater-show' : 'api::movie.movie';
    try {
      const row = await strapi.entityService.findOne(uid, cmsId, {
        populate: { more_event_ids: true },
        publicationState: 'preview',
      });
      if (!row) continue;

      const existing = row.more_event_ids ?? row.moreEventIds ?? [];
      const hasNew = items.some(
        (item) => !existing.some((e) => normalizeEventId(e.event_id) === item.eventId),
      );
      const next = mergeEventIdRows(existing, items);
      if (!hasNew && next.length === existing.length) continue;

      await strapi.entityService.update(uid, cmsId, {
        data: { more_event_ids: next },
      });
      persisted += 1;
      entries += items.length;
    } catch (e) {
      strapi.log.warn(
        `[more-event-id-persist] ${contentKind} #${cmsId}: ${e?.message || e}`,
      );
    }
  }

  queue.clear();
  if (entries > 0 && typeof onProgress === 'function') {
    onProgress(`Cache eventId: αποθηκεύτηκαν ${entries} ταυτίσεις σε ${persisted} εγγραφές CMS`);
  }
  return { persisted, entries };
}

module.exports = {
  MAX_EVENT_IDS_PER_ENTRY,
  MIN_SCORE_TO_PERSIST,
  createEventIdPersistQueue,
  loadPersistedCinemaEventIdsIntoIndex,
  loadPersistedTheaterEventIdsIntoIndex,
  queueScrapeMappingForPersist,
  flushEventIdPersistQueue,
  mergePersistedMovieRowsIntoIndex,
  mergePersistedTheaterRowsIntoIndex,
};
