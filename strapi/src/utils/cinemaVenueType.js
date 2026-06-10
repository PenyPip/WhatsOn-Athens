'use strict';

/** Τιμές τύπου «σινεμά» στο CMS (enum key + παλιές ετικέτες στη βάση). */
const CINEMA_TYPE_VALUES = ['cinema', 'Σινεμά', 'σινεμά'];

const LEGACY_VENUE_TYPE_TO_ENUM = {
  'Σινεμά': 'cinema',
  'σινεμά': 'cinema',
  'Θέατρο': 'theater',
  'Μουσική Σκηνή': 'other',
  'Πολυχώρος': 'other',
  'Άλλο': 'other',
  'άλλο': 'other',
};

function isCinemaVenue(venue) {
  const t = venue?.type;
  if (!t) return false;
  if (CINEMA_TYPE_VALUES.includes(t)) return true;
  const lower = String(t).toLowerCase();
  return lower === 'cinema' || lower === 'σινεμά';
}

function cinemaVenueTypeFilter() {
  return { type: { $in: CINEMA_TYPE_VALUES } };
}

/** Παλιές ελληνικές ετικέτες → cinema / theater / other (χωρίς validation). */
async function migrateLegacyVenueTypes(strapi) {
  const store = strapi.store({ type: 'plugin', name: 'whatson-venue-types' });
  let updated = 0;

  const missingType = await strapi.db.query('api::venue.venue').findMany({
    where: { type: { $null: true } },
    select: ['id'],
  });
  for (const row of missingType) {
    await strapi.db.query('api::venue.venue').update({
      where: { id: row.id },
      data: { type: 'cinema' },
    });
    updated += 1;
  }

  if (!(await store.get({ key: 'migratedV2' }))) {
    for (const [from, to] of Object.entries(LEGACY_VENUE_TYPE_TO_ENUM)) {
      const rows = await strapi.db.query('api::venue.venue').findMany({
        where: { type: from },
        select: ['id'],
      });
      for (const row of rows) {
        await strapi.db.query('api::venue.venue').update({
          where: { id: row.id },
          data: { type: to },
        });
        updated += 1;
      }
    }
    await store.set({ key: 'migratedV2', value: true });
  }

  if (updated > 0) {
    strapi.log.info(`[whatson] venue type migration: ${updated} εγγραφές → cinema/theater/other`);
  }
}

module.exports = {
  isCinemaVenue,
  cinemaVenueTypeFilter,
  migrateLegacyVenueTypes,
  CINEMA_TYPE_VALUES,
};
