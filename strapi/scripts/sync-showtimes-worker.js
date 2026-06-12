'use strict';

/**
 * Ξεχωριστή Node διεργασία — το sync δεν τρέχει μέσα στο Strapi HTTP process.
 * Αν OOM/crash, το κύριο Strapi (admin/site) μένει ζωντανό.
 *
 *   node scripts/sync-showtimes-worker.js sync-1234567890
 */

const path = require('path');

process.chdir(path.join(__dirname, '..'));

function persistWorkerFailure(jobId, message) {
  if (!jobId) return;
  try {
    const { failJobById } = require('../src/utils/moreShowtimeSyncJob');
    failJobById(jobId, message);
  } catch (patchErr) {
    console.error('[sync-worker] could not persist failure', patchErr);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[sync-worker] uncaughtException:', err?.stack || err);
  persistWorkerFailure(process.argv[2], err?.message || String(err));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[sync-worker] unhandledRejection:', reason);
  const msg = reason?.message || String(reason);
  persistWorkerFailure(process.argv[2], msg);
  process.exit(1);
});

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error('[sync-worker] Απαιτείται job id ως όρισμα.');
    process.exit(1);
  }

  const { runMoreShowtimeSyncWorker } = require('../src/utils/moreShowtimeSyncJob');
  await runMoreShowtimeSyncWorker(jobId);
}

main().catch((e) => {
  console.error('[sync-worker] fatal:', e?.stack || e);
  persistWorkerFailure(process.argv[2], e?.message || String(e));
  process.exit(1);
});
