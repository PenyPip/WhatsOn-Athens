'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { syncAllCinemaVenues } = require('../services/program-status');

module.exports = createCoreController('api::venue.venue', ({ strapi }) => ({
  /** Χειροκίνητος έλεγχος needs_update + info (όλα τα σινεμά). */
  async syncProgramStatus(ctx) {
    try {
      const summary = await syncAllCinemaVenues(strapi, {
        logChange: true,
        onlyIfNotUpdated: false,
      });

      const message =
        `Ελέγχθηκαν ${summary.total} σινεμά · ${summary.complete} με προβολές επόμενης εβδομάδας · ` +
        `${summary.missing} χρειάζονται ενημέρωση · ${summary.pendingManual} χωρίς «ολοκλήρωσα».`;

      ctx.body = { ok: true, message, summary };
    } catch (err) {
      strapi.log.error('[venue] syncProgramStatus απέτυχε', err);
      return ctx.internalServerError('Αποτυχία ελέγχου προγράμματος.');
    }
  },
}));
