'use strict';

/**
 * Ξεχωριστή Node διεργασία — το sync δεν τρέχει μέσα στο Strapi HTTP process.
 * Αν OOM/crash, το κύριο Strapi (admin/site) μένει ζωντανό.
 *
 *   node scripts/sync-showtimes-worker.js sync-1234567890
 */

const path = require('path');

process.chdir(path.join(__dirname, '..'));

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
  process.exit(1);
});
