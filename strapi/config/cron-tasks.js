'use strict';

/**
 * Κάθε Σάββατο 06:00 (ώρα server) — `venue.updated` → no_new για όλα τα σινεμά.
 * Μέχρι Κυριακή: στόχος = τρέχουσα εβδομάδα κινηματογράφου · Δευτέρα+: επόμενη.
 *
 * More σινεμά (ταινίες): Κυριακή–Τετάρτη 3×/ημέρα.
 * Athinorama (τρέχουσα εβδομάδα μόνο): Πέμπτη 3× — το Athinorama δεν έχει μελλοντικές προβολές.
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
  /**
   * Κυριακή–Τετάρτη ~10:00 / 14:00 / 18:00 Europe/Athens (UTC καλοκαίρι: 07/11/15).
   * Βασικό More sync μόνο σινεμά/ταινίες (επόμενη εβδομάδα Δευ–Τετ · τρέχουσα Κυρ).
   */
  moreCinemaShowtimeSyncSunWed: {
    task: async ({ strapi }) => {
      if (process.env.MORE_SHOWTIME_SYNC_ENABLED === 'false') return;
      if (process.env.MORE_SHOWTIME_SYNC_CRON === 'false') return;
      try {
        const { athensLocalDate } = require('../src/utils/cinemaWeek');
        const dow = athensLocalDate().getDay(); // 0=Κυρ … 3=Τετ
        if (dow < 0 || dow > 3) return;

        const { startMoreShowtimeSyncJob, getMoreShowtimeSyncJob } = require('../src/utils/moreShowtimeSyncJob');
        const existing = getMoreShowtimeSyncJob(strapi);
        if (existing?.status === 'running') {
          strapi.log.info(
            `[cron] moreCinemaShowtimeSyncSunWed: ήδη τρέχει job=${existing.id} — skip`,
          );
          return;
        }

        const started = startMoreShowtimeSyncJob(strapi, { scope: 'cinema' });
        strapi.log.info(
          `[cron] moreCinemaShowtimeSyncSunWed: ${
            started.started ? 'started' : started.reason || 'not_started'
          } job=${started.job?.id || '—'}`,
        );
      } catch (e) {
        strapi.log.error('[cron] moreCinemaShowtimeSyncSunWed', e);
      }
    },
    options: {
      // Κυρ–Τετ 07:00, 11:00, 15:00 UTC ≈ 10:00 / 14:00 / 18:00 Αθήνα (θερινή ώρα)
      rule: '0 7,11,15 * * 0,1,2,3',
    },
  },
  /**
   * Πέμπτη ~10:00 / 14:00 / 18:00 Europe/Athens (ώρα server UTC: 07/11/15 το καλοκαίρι).
   * Ξανατρέχει μέχρι να γεμίσουν τα εκκρεμή — το πρόγραμμα συχνά ανεβαίνει σταδιακά.
   */
  athinoramaPendingSyncThursday: {
    task: async ({ strapi }) => {
      if (process.env.ATHINORAMA_AUTO_SYNC === 'false') return;
      try {
        const {
          syncPendingAthinoramaVenues,
          isAthinoramaSyncThursday,
        } = require('../src/utils/athinoramaShowtimeSync');
        if (!isAthinoramaSyncThursday()) return;
        const report = await syncPendingAthinoramaVenues(strapi, {
          onProgress: (msg) => strapi.log.info(`[cron] ${msg}`),
        });
        strapi.log.info(`[cron] athinoramaPendingSyncThursday: ${report.message}`);
      } catch (e) {
        strapi.log.error('[cron] athinoramaPendingSyncThursday', e);
      }
    },
    options: {
      // Πέμπτη 07:00, 11:00, 15:00 UTC ≈ 10:00 / 14:00 / 18:00 Αθήνα (θερινή ώρα)
      rule: '0 6,10,14 * * 4',
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
