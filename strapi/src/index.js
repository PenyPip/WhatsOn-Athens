'use strict';

/** Ανάγνωση από το δημόσιο API (χωρίς JWT)· χωρίς αυτά η αρχική μένει κενή (403). */
const PUBLIC_COLLECTION_READ_ACTIONS = [
  'api::movie.movie.find',
  'api::movie.movie.findOne',
  'api::movie-genre.movie-genre.find',
  'api::movie-genre.movie-genre.findOne',
  'api::showtime.showtime.find',
  'api::showtime.showtime.findOne',
  'api::venue.venue.find',
  'api::venue.venue.findOne',
  'api::hall.hall.find',
  'api::hall.hall.findOne',
  'api::theater-show.theater-show.find',
  'api::theater-show.theater-show.findOne',
  'api::restaurant.restaurant.find',
  'api::restaurant.restaurant.findOne',
  'api::editorial-review.editorial-review.find',
  'api::editorial-review.editorial-review.findOne',
  'api::user-review.user-review.find',
  'api::user-review.user-review.findOne',
];

const PUBLIC_SINGLE_TYPE_ACTIONS = ['api::homepage.homepage.find'];

async function enablePublicPermission(strapi, action, publicRoleId) {
  let perms = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: publicRoleId, action },
    limit: 1,
  });
  let permission = perms[0];
  /** Νέοι τύποι CMS (π.χ. Είδος ταινίας): η εγγραφή permission πρέπει να δημιουργείται ή δεν εμφανίζεται στο REST populate. */
  if (!permission) {
    try {
      permission = await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action, enabled: true, role: publicRoleId },
      });
      strapi.log.info(`[whatson] Δημιουργήθηκε + Public: ${action}`);
    } catch (e) {
      strapi.log.warn(
        `[whatson] Δεν ήταν δυνατή η δημιουργία permission για Public: "${action}". Admin → Users & Permissions → Public → όρισε χειροκίνητα. ${e}`,
      );
      return false;
    }
    return true;
  }
  if (!permission.enabled) {
    await strapi.db.query('plugin::users-permissions.permission').update({
      where: { id: permission.id },
      data: { enabled: true },
    });
    strapi.log.info(`[whatson] Ενεργοποιήθηκε Public: ${action}`);
  }
  return true;
}

module.exports = {
  /**
   * @param {{ strapi: import('@strapi/strapi').Strapi }} opts
   */
  async bootstrap({ strapi }) {
    try {
      const publicRole = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' } });

      if (!publicRole) return;

      for (const action of PUBLIC_SINGLE_TYPE_ACTIONS) {
        await enablePublicPermission(strapi, action, publicRole.id);
      }

      for (const action of PUBLIC_COLLECTION_READ_ACTIONS) {
        await enablePublicPermission(strapi, action, publicRole.id);
      }
    } catch (e) {
      strapi.log.warn('[whatson bootstrap public API permissions]', e);
    }

    try {
      const { expandAllPendingRepeatShowtimes } = require('./api/showtime/services/showtime-repeat');
      await expandAllPendingRepeatShowtimes(strapi);
    } catch (e) {
      strapi.log.warn('[whatson bootstrap showtime repeat]', e);
    }

    try {
      const { migrateLegacyVenueTypes } = require('./utils/cinemaVenueType');
      await migrateLegacyVenueTypes(strapi);
    } catch (e) {
      strapi.log.warn('[whatson bootstrap venue types]', e);
    }

  },
};
