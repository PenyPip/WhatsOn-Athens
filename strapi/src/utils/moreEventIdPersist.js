'use strict';

const MAX_EVENT_IDS_PER_ENTRY = Number(process.env.MORE_EVENT_ID_CACHE_MAX || 120);
const MIN_SCORE_TO_PERSIST = Number(process.env.MORE_EVENT_ID_PERSIST_MIN_SCORE || 0.85);

/** Synthetic keys στο eventId index — όχι πραγματικά More eventIds. */
const PLAY_ID_EVENT_PREFIX = 'play:';
const TITLE_ALIAS_EVENT_PREFIX = '__title:';

function normalizeEventId(raw) {
  return String(raw ?? '').trim();
}

function unmatchedTitleKey(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function playIdEventKey(playId) {
  const id = normalizeEventId(playId);
  if (!id || id.startsWith(PLAY_ID_EVENT_PREFIX)) return id || '';
  return `${PLAY_ID_EVENT_PREFIX}${id}`;
}

function titleAliasEventKey(playTitle) {
  const key = unmatchedTitleKey(playTitle);
  return key ? `${TITLE_ALIAS_EVENT_PREFIX}${key}` : '';
}

function isSyntheticEventIdKey(eventId) {
  const key = normalizeEventId(eventId);
  return (
    key.startsWith(PLAY_ID_EVENT_PREFIX) || key.startsWith(TITLE_ALIAS_EVENT_PREFIX)
  );
}

/**
 * Χειροκίνητη / cached ταύτιση τίτλου ή playId → CMS (όταν το auto title-match αποτυγχάνει).
 */
function lookupPersistedPlayAlias(eventIdIndex, { playTitle, playId } = {}) {
  if (!eventIdIndex) return null;
  const playKey = playIdEventKey(playId);
  if (playKey) {
    const byPlay = eventIdIndex.get(playKey);
    if (byPlay) return byPlay;
  }
  const titleKey = titleAliasEventKey(playTitle);
  if (titleKey) {
    const byTitle = eventIdIndex.get(titleKey);
    if (byTitle) return byTitle;
  }
  return null;
}

function registerTitleAlias(index, playTitle, mapping) {
  const key = titleAliasEventKey(playTitle);
  if (!key || !index || !mapping || index.has(key)) return;
  index.set(key, { ...mapping, viaTitleAlias: true });
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
    const mapping = {
      movieId: movie.id,
      movieTitle: movie.title,
      viaPersisted: true,
    };
    for (const row of cached) {
      const eventId = normalizeEventId(row.event_id ?? row.eventId);
      const playTitle = String(row.play_title ?? row.playTitle ?? '').trim();
      if (eventId && !index.has(eventId)) {
        index.set(eventId, mapping);
        added += 1;
      }
      // Σταθερό alias: νέα eventIds ίδιου τίτλου/play στο επόμενο sync → ίδια ταινία.
      if (playTitle) registerTitleAlias(index, playTitle, mapping);
    }
  }
  return added;
}

function mergePersistedTheaterRowsIntoIndex(rows, index) {
  let added = 0;
  for (const show of rows || []) {
    const cached = show.more_event_ids ?? show.moreEventIds ?? [];
    const mapping = {
      theaterShowId: show.id,
      showTitle: show.title,
      viaPersisted: true,
    };
    for (const row of cached) {
      const eventId = normalizeEventId(row.event_id ?? row.eventId);
      const playTitle = String(row.play_title ?? row.playTitle ?? '').trim();
      if (eventId && !index.has(eventId)) {
        index.set(eventId, mapping);
        added += 1;
      }
      if (playTitle) registerTitleAlias(index, playTitle, mapping);
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

/**
 * Χειροκίνητη ταύτιση από sync report: γράφει eventIds (+ προαιρετικά play:id)
 * και play_title στο more_event_ids ώστε το επόμενο sync να αναγνωρίζει
 * και νέα eventIds του ίδιου τίτλου/έργου.
 */
async function linkEventIdsManually(strapi, {
  contentType = 'movie',
  cmsId,
  eventIds = [],
  playId = '',
  playTitle = '',
} = {}) {
  const id = Number(cmsId);
  const kind = contentType === 'theater_show' ? 'theater_show' : 'movie';
  const uid = kind === 'theater_show' ? 'api::theater-show.theater-show' : 'api::movie.movie';
  if (!Number.isFinite(id)) {
    return { ok: false, error: 'Απαιτείται cmsId' };
  }

  const title = String(playTitle || '').trim();
  const ids = [...new Set((eventIds || []).map((e) => normalizeEventId(e)).filter(Boolean))];
  const syntheticPlay = playIdEventKey(playId);
  if (syntheticPlay) ids.push(syntheticPlay);
  // Χωρίς eventId/playId: σταθερό title-alias key ώστε να μείνει η χειροκίνητη ταύτιση.
  if (!ids.length && title) {
    ids.push(titleAliasEventKey(title));
  }
  if (!ids.length) {
    return { ok: false, error: 'Απαιτείται τουλάχιστον ένα eventId, playId ή playTitle' };
  }

  const row = await strapi.entityService.findOne(uid, id, {
    populate: { more_event_ids: true },
    publicationState: 'preview',
  });
  if (!row) {
    return { ok: false, error: 'Η εγγραφή CMS δεν βρέθηκε' };
  }

  const existing = row.more_event_ids ?? row.moreEventIds ?? [];
  const incoming = ids.map((eventId) => ({
    eventId,
    moreVenueId: '',
    playTitle: title,
  }));
  const next = mergeEventIdRows(existing, incoming);
  const already = ids.every((eventId) =>
    existing.some((e) => normalizeEventId(e.event_id ?? e.eventId) === eventId),
  );

  if (!already) {
    await strapi.entityService.update(uid, id, {
      data: { more_event_ids: next },
    });
  }

  const cmsTitle = row.title || row.name || `#${id}`;
  const realEventCount = ids.filter((e) => !isSyntheticEventIdKey(e)).length;
  return {
    ok: true,
    alreadyLinked: already,
    contentType: kind,
    cmsId: id,
    cmsTitle,
    eventIds: ids,
    playId: syntheticPlay || null,
    playTitle: title || null,
    message: already
      ? `Η ταύτιση υπάρχει ήδη στο «${cmsTitle}»`
      : `Συνδέθηκε «${title || ids[0]}» → «${cmsTitle}»` +
        (realEventCount ? ` (${realEventCount} eventId)` : '') +
        (title ? ' · alias τίτλου για επόμενα sync' : '') +
        '. Ξανατρέξε sync για να μπουν οι προβολές.',
  };
}

module.exports = {
  MAX_EVENT_IDS_PER_ENTRY,
  MIN_SCORE_TO_PERSIST,
  PLAY_ID_EVENT_PREFIX,
  TITLE_ALIAS_EVENT_PREFIX,
  playIdEventKey,
  titleAliasEventKey,
  isSyntheticEventIdKey,
  lookupPersistedPlayAlias,
  createEventIdPersistQueue,
  loadPersistedCinemaEventIdsIntoIndex,
  loadPersistedTheaterEventIdsIntoIndex,
  queueScrapeMappingForPersist,
  flushEventIdPersistQueue,
  linkEventIdsManually,
  mergePersistedMovieRowsIntoIndex,
  mergePersistedTheaterRowsIntoIndex,
};
