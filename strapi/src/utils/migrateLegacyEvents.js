'use strict';

function humanizeSlug(slug) {
  if (typeof slug !== 'string') return '';
  return slug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Μεταφορά παλιών events (name, venue_name κ.λπ.) → νέο schema (title_el, venue relation). */
async function migrateLegacyEvents(strapi) {
  const store = strapi.store({ type: 'plugin', name: 'whatson-events' });
  if (await store.get({ key: 'legacyMigratedV1' })) return;

  const knex = strapi.db.connection;
  const legacyById = new Map();

  try {
    const hasName = await knex.schema.hasColumn('events', 'name');
    const hasVenueName = await knex.schema.hasColumn('events', 'venue_name');
    const hasVenueAddress = await knex.schema.hasColumn('events', 'venue_address');
    const hasOrganizer = await knex.schema.hasColumn('events', 'organizer');

    if (hasName || hasVenueName || hasVenueAddress || hasOrganizer) {
      const cols = ['id'];
      if (hasName) cols.push('name');
      if (hasVenueName) cols.push('venue_name');
      if (hasVenueAddress) cols.push('venue_address');
      if (hasOrganizer) cols.push('organizer');
      const rows = await knex('events').select(cols);
      for (const row of rows) legacyById.set(row.id, row);
    }
  } catch (e) {
    strapi.log.warn('[whatson] event legacy column read', e);
  }

  const events = await strapi.entityService.findMany('api::event.event', {
    publicationState: 'preview',
    populate: { articles: { fields: ['title', 'slug'] }, venue: true },
    limit: 5000,
  });
  const list = Array.isArray(events) ? events : events ? [events] : [];

  let updated = 0;
  for (const ev of list) {
    const legacy = legacyById.get(ev.id);
    const patch = {};

    if (!String(ev.title_el || '').trim()) {
      const fromName = typeof legacy?.name === 'string' ? legacy.name.trim() : '';
      const articles = Array.isArray(ev.articles) ? ev.articles : ev.articles ? [ev.articles] : [];
      const linkedArticle = articles.find((a) => a?.title?.trim()) ?? articles[0];
      const fromArticle = linkedArticle?.title?.trim() || '';
      const fromSlug = humanizeSlug(ev.slug);
      patch.title_el = fromName || fromArticle || fromSlug || ev.slug || 'Event';
    }

    if (!ev.event_type) {
      patch.event_type = 'art';
    }

    if (ev.featured == null) {
      patch.featured = false;
    }

    if (!ev.venue?.id) {
      const venueName = typeof legacy?.venue_name === 'string' ? legacy.venue_name.trim() : '';
      const venueAddress = typeof legacy?.venue_address === 'string' ? legacy.venue_address.trim() : '';
      if (venueName) {
        const matches = await strapi.entityService.findMany('api::venue.venue', {
          filters: { name: { $containsi: venueName } },
          limit: 1,
        });
        const venue = Array.isArray(matches) ? matches[0] : matches;
        if (venue?.id) {
          patch.venue = venue.id;
        } else if (!String(ev.synopsis_el || '').trim() && (venueName || venueAddress)) {
          const line = [venueName, venueAddress].filter(Boolean).join(', ');
          patch.synopsis_el = `Χώρος: ${line}`;
        }
      }
    }

    const organizer = typeof legacy?.organizer === 'string' ? legacy.organizer.trim() : '';
    if (organizer && !String(ev.editorial_note_el || '').trim()) {
      patch.editorial_note_el = organizer;
    }

    if (Object.keys(patch).length === 0) continue;

    await strapi.entityService.update('api::event.event', ev.id, { data: patch });
    updated += 1;
  }

  await store.set({ key: 'legacyMigratedV1', value: true });
  if (updated > 0) {
    strapi.log.info(`[whatson] event legacy migration: ${updated} εκδηλώσεις ενημερώθηκαν`);
  }
}

module.exports = { migrateLegacyEvents };
