'use strict';

/**
 * Κάθε Δευτέρα 06:00 (ώρα server) — `venue.updated` → false για όλα τα σινεμά.
 * Ο administrator το ξαναενεργοποιεί χειροκίνητα όταν ολοκληρώσει το πρόγραμμα της εβδομάδας.
 */
module.exports = {
  resetCinemaVenueUpdatedMonday: {
    task: async ({ strapi }) => {
      try {
        const { resetCinemaManualCompleted } = require('../src/api/venue/services/program-status');
        await resetCinemaManualCompleted(strapi);
      } catch (e) {
        strapi.log.error('[cron] resetCinemaVenueUpdatedMonday', e);
      }
    },
    options: {
      rule: '0 6 * * 1',
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
  }
  /*syncMoreShowtimesDaily: {
    task: async ({ strapi }) => {
      if (process.env.MORE_SHOWTIME_SYNC_ENABLED === 'false') return;
      try {
        const { syncShowtimesFromMore } = require('../src/utils/moreShowtimeSync');
        const report = await syncShowtimesFromMore(strapi);
        strapi.log.info(`[cron] syncMoreShowtimesDaily: ${report.message || report.created}`);
      } catch (e) {
        strapi.log.error('[cron] syncMoreShowtimesDaily', e);
      }
    },
    options: {
      // Κάθε μέρα 06:45 (μετά τη διαγραφή παλιών προβολών 04:20)
      rule: '45 6 * * *',
    },
  },
*/
};
