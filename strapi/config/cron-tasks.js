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
};
