'use strict';

/**
 * Κάθε Σάββατο 06:00 (ώρα server) — `venue.updated` → no_new για όλα τα σινεμά.
 * Σημαίνει «δεν έχουν μπει ακόμα οι νέες προβολές της επόμενης εβδομάδας».
 */
module.exports = {
  resetCinemaVenueUpdatedMonday: {
    task: async ({ strapi }) => {
      try {
        const { resetCinemaManualCompleted } = require('../src/api/venue/services/program-status');
        await resetCinemaManualCompleted(strapi);
      } catch (e) {
        strapi.log.error('[cron] resetCinemaVenueUpdatedSaturday', e);
      }
    },
    options: {
      rule: '0 6 * * 6',
    },
  },
  deletePastCinemaShowtimesDaily: {
    task: async ({ strapi }) => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const staleRows = await strapi.entityService.findMany('api::showtime.showtime', {
          filters: {
            datetime: { $lt: todayStart.toISOString() },
          },
          fields: ['id', 'datetime'],
          populate: {
            venue: {
              fields: ['id', 'type', 'name'],
            },
          },
          publicationState: 'preview',
          pagination: { pageSize: 2000 },
        });
        const list = Array.isArray(staleRows) ? staleRows : [];
        const toDelete = list
          .filter((row) => row?.venue?.type === 'cinema')
          .map((row) => row.id)
          .filter((id) => Number.isFinite(Number(id)));
        if (!toDelete.length) return;
        for (const id of toDelete) {
          await strapi.entityService.delete('api::showtime.showtime', id);
        }
        strapi.log.info(`[cron] deletePastCinemaShowtimesDaily: deleted ${toDelete.length} showtime(s)`);
      } catch (e) {
        strapi.log.error('[cron] deletePastCinemaShowtimesDaily', e);
      }
    },
    options: {
      // Κάθε μέρα 04:20 (ώρα server)
      rule: '20 4 * * *',
    },
  },
  deletePastTheaterPerformancesDaily: {
    task: async ({ strapi }) => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const staleRows = await strapi.entityService.findMany(
          'api::theater-performance.theater-performance',
          {
            filters: {
              datetime: { $lt: todayStart.toISOString() },
            },
            fields: ['id', 'datetime'],
            pagination: { pageSize: 2000 },
          },
        );
        const list = Array.isArray(staleRows) ? staleRows : [];
        const toDelete = list.map((row) => row.id).filter((id) => Number.isFinite(Number(id)));
        if (!toDelete.length) return;
        for (const id of toDelete) {
          await strapi.entityService.delete('api::theater-performance.theater-performance', id);
        }
        strapi.log.info(
          `[cron] deletePastTheaterPerformancesDaily: deleted ${toDelete.length} performance(s)`,
        );
      } catch (e) {
        strapi.log.error('[cron] deletePastTheaterPerformancesDaily', e);
      }
    },
    options: {
      // Κάθε μέρα 04:20
      rule: '20 4 * * *',
    },
  },
};
