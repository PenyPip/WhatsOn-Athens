'use strict';

const DEFAULT_CUISINE_LABELS = [
  'Ελληνική',
  'Ιαπωνο-ελληνική',
  'Γαλλο-μεσογειακή',
  'Μοριακή Γαστρονομία',
];

/** Δημιουργία collection Κουζίνα + σύνδεση από legacy στήλη κειμένου (cuisine) αν υπάρχει. */
async function migrateRestaurantCuisines(strapi) {
  const store = strapi.store({ type: 'plugin', name: 'whatson-cuisines' });
  if (await store.get({ key: 'migrated' })) return;

  const labelToId = new Map();
  let sortOrder = 0;

  async function ensureCuisine(label) {
    const trimmed = typeof label === 'string' ? label.trim() : '';
    if (!trimmed) return null;
    if (labelToId.has(trimmed)) return labelToId.get(trimmed);

    const existing = await strapi.entityService.findMany('api::cuisine.cuisine', {
      filters: { label: trimmed },
      limit: 1,
    });
    const row = Array.isArray(existing) ? existing[0] : existing;
    if (row?.id) {
      labelToId.set(trimmed, row.id);
      return row.id;
    }

    const created = await strapi.entityService.create('api::cuisine.cuisine', {
      data: { label: trimmed, sort_order: sortOrder },
    });
    sortOrder += 1;
    labelToId.set(trimmed, created.id);
    return created.id;
  }

  for (const label of DEFAULT_CUISINE_LABELS) {
    await ensureCuisine(label);
  }

  /** id → παλιό κείμενο κουζίνας (legacy στήλη cuisine πριν το relation). */
  const legacyTextById = new Map();

  try {
    const knex = strapi.db.connection;
    if (await knex.schema.hasColumn('restaurants', 'cuisine')) {
      const rows = await knex('restaurants').select('id', 'cuisine');
      for (const row of rows) {
        const raw = row.cuisine;
        if (typeof raw === 'string' && raw.trim() && !legacyTextById.has(row.id)) {
          legacyTextById.set(row.id, raw.trim());
        }
      }
    }
  } catch (e) {
    strapi.log.warn('[whatson] restaurant cuisine legacy column read', e);
  }

  const restaurants = await strapi.entityService.findMany('api::restaurant.restaurant', {
    publicationState: 'preview',
    populate: { cuisine: true },
    limit: 5000,
  });
  const list = Array.isArray(restaurants) ? restaurants : restaurants ? [restaurants] : [];

  let linked = 0;
  for (const rest of list) {
    if (rest.cuisine?.id) continue;
    const text = legacyTextById.get(rest.id);
    if (!text) continue;
    const cuisineId = await ensureCuisine(text);
    if (!cuisineId) continue;
    await strapi.entityService.update('api::restaurant.restaurant', rest.id, {
      data: { cuisine: cuisineId },
    });
    linked += 1;
  }

  await store.set({ key: 'migrated', value: true });
  if (linked > 0) {
    strapi.log.info(`[whatson] restaurant cuisine migration: ${linked} εστιατόρια συνδέθηκαν με κουζίνα`);
  }
}

module.exports = { migrateRestaurantCuisines, DEFAULT_CUISINE_LABELS };
