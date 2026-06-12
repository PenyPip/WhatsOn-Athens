'use strict';

/**
 * Offline sync — τρέχει ΜΟΝΟ του Strapi (χωρίς παράλληλο instance).
 * Χρήση στο server όταν το admin δίνει 502:
 *
 *   docker compose stop strapi
 *   docker compose run --rm --no-deps strapi node scripts/sync-offline.js
 *   docker compose start strapi
 */

const path = require('path');

process.chdir(path.join(__dirname, '..'));

async function main() {
  const id = `sync-offline-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const jobFile = path.join(process.cwd(), 'data', 'more-showtime-sync-job.json');

  const fs = require('fs');
  const dir = path.dirname(jobFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const writeJob = (patch) => {
    const current = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
    Object.assign(current, patch);
    fs.writeFileSync(jobFile, JSON.stringify(current));
  };

  fs.writeFileSync(
    jobFile,
    JSON.stringify({
      id,
      status: 'running',
      startedAt,
      lastProgressAt: startedAt,
      progress: 'Offline sync: εκκίνηση Strapi…',
      report: null,
      error: null,
    }),
  );

  console.log(`[sync-offline] job ${id}`);
  const Strapi = require('@strapi/strapi');
  const { syncShowtimesFromMore } = require('../src/utils/moreShowtimeSync');

  let strapi;
  try {
    strapi = await Strapi().load();
    const onProgress = (msg) => {
      if (!msg) return;
      writeJob({
        status: 'running',
        lastProgressAt: new Date().toISOString(),
        progress: msg,
      });
      console.log(`[sync-offline] ${msg}`);
    };

    const report = await syncShowtimesFromMore(strapi, { onProgress });
    writeJob({
      status: 'completed',
      report,
      finishedAt: new Date().toISOString(),
      progress: report.message || 'Ολοκληρώθηκε',
      error: null,
    });
    console.log(`[sync-offline] OK — ${report.message}`);
  } catch (e) {
    const msg = e?.message || String(e);
    writeJob({
      status: 'failed',
      error: msg,
      finishedAt: new Date().toISOString(),
      progress: `Αποτυχία: ${msg}`,
    });
    console.error('[sync-offline] FAILED:', e);
    process.exitCode = 1;
  } finally {
    if (strapi) {
      try {
        await strapi.destroy();
      } catch {
        // ignore
      }
    }
  }
}

main();
