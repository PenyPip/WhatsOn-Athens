'use strict';

const ATHENS_TZ = 'Europe/Athens';
const { syncAllCinemaVenues } = require('../src/api/venue/services/program-status');

/**
 * Κάθε Σάββατο 14:00: updated → false (ολοκλήρωσα), needs_update από προβολές επόμενης εβδομάδας.
 */
async function resetCinemaProgramUpdated(strapi) {
  const summary = await syncAllCinemaVenues(strapi, { resetManualCompleted: true, logChange: false });
  strapi.log.info(
    `[cron] Σάββατο 14:00 ${ATHENS_TZ}: ${summary.missing} needs_update, ${summary.complete} με προβολές, ${summary.pendingManual} χωρίς «ολοκλήρωσα»`,
  );
}

/** Καθημερινά 09:00 — needs_update + info (το updated μένει χειροκίνητο). */
async function dailyProgramStatusSync(strapi) {
  const summary = await syncAllCinemaVenues(strapi, { logChange: true });
  strapi.log.info(
    `[cron] daily program: ${summary.complete} OK, ${summary.missing} χρειάζονται ενημέρωση`,
  );
}

module.exports = {
  dailyProgramStatusSync: {
    task: async ({ strapi }) => {
      try {
        await dailyProgramStatusSync(strapi);
      } catch (err) {
        strapi.log.error('[cron] dailyProgramStatusSync απέτυχε', err);
      }
    },
    options: {
      rule: '0 9 * * *',
      tz: ATHENS_TZ,
    },
  },
  resetCinemaProgramUpdated: {
    task: async ({ strapi }) => {
      try {
        await resetCinemaProgramUpdated(strapi);
      } catch (err) {
        strapi.log.error('[cron] resetCinemaProgramUpdated απέτυχε', err);
      }
    },
    options: {
      rule: '0 14 * * 6',
      tz: ATHENS_TZ,
    },
  },
};
