'use strict';

/** Ανάγνωση από το δημόσιο API (χωρίς JWT)· χωρίς αυτά η αρχική μένει κενή (403). */
const PUBLIC_COLLECTION_READ_ACTIONS = [
  'api::movie.movie.find',
  'api::movie.movie.findOne',
  'api::movie-genre.movie-genre.find',
  'api::movie-genre.movie-genre.findOne',
  'api::cuisine.cuisine.find',
  'api::cuisine.cuisine.findOne',
  'api::showtime.showtime.find',
  'api::showtime.showtime.findOne',
  'api::showtime.showtime.venueCalendar',
  'api::venue.venue.find',
  'api::venue.venue.findOne',
  'api::hall.hall.find',
  'api::hall.hall.findOne',
  'api::theater-show.theater-show.find',
  'api::theater-show.theater-show.findOne',
  'api::theater-performance.theater-performance.find',
  'api::theater-performance.theater-performance.findOne',
  'api::restaurant.restaurant.find',
  'api::restaurant.restaurant.findOne',
  'api::editorial-review.editorial-review.find',
  'api::editorial-review.editorial-review.findOne',
  'api::article.article.find',
  'api::article.article.findOne',
  'api::event.event.find',
  'api::event.event.findOne',
  'api::user-review.user-review.find',
  'api::user-review.user-review.findOne',
];

const PUBLIC_SINGLE_TYPE_ACTIONS = [
  'api::homepage.homepage.find',
  'api::site-navigation.site-navigation.find',
];

const DEFAULT_NAV_ITEMS = [
  { label: 'Αρχική', path: '/', icon: 'home', show_on_desktop: true, show_on_mobile_tab: false },
  { label: 'Ταινίες', path: '/movies', icon: 'film', show_on_desktop: true, show_on_mobile_tab: true },
  { label: 'Θέατρο', path: '/theater', icon: 'theater', show_on_desktop: true, show_on_mobile_tab: true },
  { label: 'Φαγητό', path: '/dining', icon: 'dining', show_on_desktop: true, show_on_mobile_tab: true },
  { label: 'Χώροι', path: '/venues', icon: 'venues', show_on_desktop: true, show_on_mobile_tab: true },
];

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

function serveCKEditorConfig(ctx) {
  const fs = require('fs');
  const path = require('path');
  const file = path.join(process.cwd(), 'config', 'ckeditor.txt');
  ctx.type = 'application/javascript; charset=utf-8';
  ctx.set('Cache-Control', 'no-store');
  ctx.body = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : 'globalThis.CKEditorConfig=null';
}

module.exports = {
  register({ strapi }) {
    strapi.server.routes([
      {
        method: 'GET',
        path: '/ckeditor5/ckeditor-config',
        handler: serveCKEditorConfig,
        config: { auth: false },
      },
    ]);
  },

  /**
   * @param {{ strapi: import('@strapi/strapi').Strapi }} opts
   */
  async bootstrap({ strapi }) {
    strapi.server.app.use(async (ctx, next) => {
      const p = ctx.path || '';
      if (p.startsWith('/content-manager') || p.startsWith('/ckeditor5')) {
        const start = Date.now();
        await next();
        strapi.log.info(`[http-detail] ${ctx.method} ${p} → ${ctx.status} (${Date.now() - start}ms)`);
        return;
      }
      await next();
    });

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

    try {
      const { migrateRestaurantCuisines } = require('./utils/migrateRestaurantCuisines');
      await migrateRestaurantCuisines(strapi);
    } catch (e) {
      strapi.log.warn('[whatson bootstrap restaurant cuisines]', e);
    }

    try {
      const { migrateLegacyEvents } = require('./utils/migrateLegacyEvents');
      await migrateLegacyEvents(strapi);
    } catch (e) {
      strapi.log.warn('[whatson bootstrap legacy events]', e);
    }

    try {
      const existing = await strapi.entityService.findMany('api::site-navigation.site-navigation', {
        publicationState: 'preview',
      });
      const hasEntry = Array.isArray(existing) ? existing.length > 0 : Boolean(existing);
      if (!hasEntry) {
        await strapi.entityService.create('api::site-navigation.site-navigation', {
          data: {
            brand_tagline: 'Cinema · Events · Culture',
            items: DEFAULT_NAV_ITEMS,
            publishedAt: new Date(),
          },
        });
        strapi.log.info('[whatson] Δημιουργήθηκε προεπιλεγμένο μενού (Μενού ιστοτόπου).');
      }
    } catch (e) {
      strapi.log.warn('[whatson bootstrap site navigation]', e);
    }

  },
};
