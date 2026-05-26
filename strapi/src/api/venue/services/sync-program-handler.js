'use strict';

const { syncAllCinemaVenues } = require('./program-status');

async function runSyncProgramStatus(strapi, options = {}) {
  const summary = await syncAllCinemaVenues(strapi, {
    logChange: true,
    onlyIfNotUpdated: false,
    ...options,
  });

  const message =
    `Ελέγχθηκαν ${summary.total} σινεμά · ${summary.ok} OK · ` +
    `${summary.needsImport} needs_update (πρόγραμμα στο link, όχι στο CMS) · ` +
    `${summary.pendingManual} χωρίς «ολοκλήρωσα».`;

  return { ok: true, message, summary };
}

module.exports = { runSyncProgramStatus };
