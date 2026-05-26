'use strict';

const { syncAllCinemaVenues } = require('./program-status');

async function runSyncProgramStatus(strapi, options = {}) {
  const summary = await syncAllCinemaVenues(strapi, {
    logChange: true,
    onlyIfNotUpdated: false,
    ...options,
  });

  const message =
    `Ελέγχθηκαν ${summary.total} σινεμά · ${summary.complete} με προβολές επόμενης εβδομάδας · ` +
    `${summary.missing} χρειάζονται ενημέρωση · ${summary.pendingManual} χωρίς «ολοκλήρωσα».`;

  return { ok: true, message, summary };
}

module.exports = { runSyncProgramStatus };
