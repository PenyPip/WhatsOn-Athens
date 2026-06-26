'use strict';

const DEFAULT_CATEGORY_LABELS = [
  'Wine bar',
  'Bistro',
  'Εστιατόριο',
  'Φούρνος',
  'Bar',
  'Café',
  'Ταβέρνα',
  'Meze bar',
];

/** Προεπιλεγμένες κατηγορίες χώρου (wine bar, bistro, φούρνος κ.λπ.). */
async function migrateRestaurantCategories(strapi) {
  const store = strapi.store({ type: 'plugin', name: 'whatson-restaurant-categories' });
  if (await store.get({ key: 'migrated' })) return;

  let sortOrder = 0;

  for (const label of DEFAULT_CATEGORY_LABELS) {
    const existing = await strapi.entityService.findMany('api::restaurant-category.restaurant-category', {
      filters: { label },
      limit: 1,
    });
    const row = Array.isArray(existing) ? existing[0] : existing;
    if (row?.id) continue;

    await strapi.entityService.create('api::restaurant-category.restaurant-category', {
      data: { label, sort_order: sortOrder },
    });
    sortOrder += 1;
  }

  await store.set({ key: 'migrated', value: true });
  strapi.log.info('[whatson] restaurant categories: προεπιλεγμένες κατηγορίες έτοιμες');
}

module.exports = { migrateRestaurantCategories, DEFAULT_CATEGORY_LABELS };
