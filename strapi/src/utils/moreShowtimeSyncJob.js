'use strict';

const { syncShowtimesFromMore } = require('./moreShowtimeSync');

/** @type {{ id: string, status: string, startedAt: string, finishedAt?: string, progress: string, report?: object, error?: string } | null} */
let activeJob = null;

function publicJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt ?? null,
    progress: job.progress,
    error: job.error ?? null,
    report: job.report ?? null,
  };
}

function getMoreShowtimeSyncJob() {
  return publicJob(activeJob);
}

function isMoreShowtimeSyncRunning() {
  return activeJob?.status === 'running';
}

/**
 * Ξεκινά sync στο background (δεν μπλοκάρει HTTP request / nginx timeout).
 * @returns {{ started: boolean, reason?: string, job: object | null }}
 */
function startMoreShowtimeSyncJob(strapi, options = {}) {
  if (activeJob?.status === 'running') {
    return { started: false, reason: 'already_running', job: publicJob(activeJob) };
  }

  const id = `sync-${Date.now()}`;
  activeJob = {
    id,
    status: 'running',
    startedAt: new Date().toISOString(),
    progress: 'Έναρξη συγχρονισμού…',
    report: null,
    error: null,
  };

  const jobRef = activeJob;

  (async () => {
    try {
      const report = await syncShowtimesFromMore(strapi, {
        ...options,
        onProgress: (msg) => {
          if (jobRef.status === 'running' && msg) jobRef.progress = msg;
        },
      });
      jobRef.status = 'completed';
      jobRef.report = report;
      jobRef.finishedAt = new Date().toISOString();
      jobRef.progress = report.message || 'Ολοκληρώθηκε';
      strapi.log.info(`[more-showtime-sync] job ${id} completed (${report.durationMs}ms)`);
    } catch (e) {
      const msg = e?.message || String(e);
      jobRef.status = 'failed';
      jobRef.error = msg;
      jobRef.finishedAt = new Date().toISOString();
      jobRef.progress = `Αποτυχία: ${msg}`;
      strapi.log.error(`[more-showtime-sync] job ${id} failed`, e);
    }
  })();

  return { started: true, job: publicJob(activeJob) };
}

module.exports = {
  getMoreShowtimeSyncJob,
  isMoreShowtimeSyncRunning,
  startMoreShowtimeSyncJob,
};
