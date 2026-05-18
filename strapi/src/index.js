'use strict';

/** Ανάγνωση από το δημόσιο API (χωρίς JWT)· χωρίς αυτά η αρχική μένει κενή (403). */
const PUBLIC_COLLECTION_READ_ACTIONS = [
  'api::movie.movie.find',
  'api::movie.movie.findOne',
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
  const perms = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: publicRoleId, action },
    limit: 1,
  });
  const permission = perms[0];
  if (!permission) {
    strapi.log.warn(
      `[whatson] Λείπει permission για Public: "${action}". Στο Strapi Admin → Settings → Users & Permissions → Public, άνοιξε την αντίστοιχη ενότητα και αποθήκευσε για να δημιουργηθούν οι εγγραφές· μετά restart.`,
    );
    return false;
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
  },
};
