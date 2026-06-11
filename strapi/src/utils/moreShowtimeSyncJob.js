'use strict';

const fs = require('fs');
const path = require('path');
const { syncShowtimesFromMore } = require('./moreShowtimeSync');

const JOB_FILE = path.join(process.cwd(), 'data', 'more-showtime-sync-job.json');
const STALE_MS = Number(process.env.MORE_SHOWTIME_SYNC_STALE_MS || 20 * 60 * 1000);
const HEARTBEAT_MS = 30_000;

/** @type {{ id: string, status: string, startedAt: string, finishedAt?: string, progress: string, report?: object, error?: string, lastProgressAt?: string } | null} */
let activeJob = null;

function ensureJobDir() {
  const dir = path.dirname(JOB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

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
    lastProgressAt: job.lastProgressAt ?? null,
  };
}

function persistJob(job) {
  if (!job) return;
  try {
    ensureJobDir();
    fs.writeFileSync(JOB_FILE, JSON.stringify(publicJob(job)));
  } catch (e) {
    // μη κρίσιμο
  }
}

function loadPersistedJob() {
  try {
    if (!fs.existsSync(JOB_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(JOB_FILE, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    return raw;
  } catch {
    return null;
  }
}

function markInterruptedIfNeeded(saved) {
  if (saved?.status !== 'running') return saved;
  return {
    ...saved,
    status: 'failed',
    error:
      'Το sync διακόπηκε (επανεκκίνηση Strapi ή crash). Τρέξε ξανά και έλεγξε τα logs του server.',
    finishedAt: new Date().toISOString(),
    progress: 'Διακόπηκε',
  };
}

function initJobStateFromDisk() {
  const saved = loadPersistedJob();
  if (!saved) return;
  const recovered = markInterruptedIfNeeded(saved);
  activeJob = recovered;
  if (recovered !== saved) persistJob(recovered);
}

initJobStateFromDisk();

function getMoreShowtimeSyncJob() {
  if (activeJob) return publicJob(activeJob);
  return loadPersistedJob();
}

function isMoreShowtimeSyncRunning() {
  return activeJob?.status === 'running';
}

function touchJobProgress(jobRef, msg) {
  const now = new Date().toISOString();
  jobRef.lastProgressAt = now;
  if (msg) jobRef.progress = msg;
  persistJob(jobRef);
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
  const startedAt = new Date().toISOString();
  activeJob = {
    id,
    status: 'running',
    startedAt,
    lastProgressAt: startedAt,
    progress: 'Έναρξη συγχρονισμού…',
    report: null,
    error: null,
  };
  persistJob(activeJob);

  const jobRef = activeJob;
  let lastProgressMs = Date.now();

  const onProgress = (msg) => {
    if (jobRef.status !== 'running' || !msg) return;
    lastProgressMs = Date.now();
    touchJobProgress(jobRef, msg);
    if (typeof options.onProgress === 'function') options.onProgress(msg);
  };

  const heartbeat = setInterval(() => {
    if (jobRef.status !== 'running') {
      clearInterval(heartbeat);
      return;
    }
    if (Date.now() - lastProgressMs > STALE_MS) {
      jobRef.status = 'failed';
      jobRef.error =
        'Το sync κόλλησε χωρίς πρόοδο (πιθανό timeout More API ή υπερβολικό φόρτο). Δοκίμασε ξανά ή μείωσε MORE_SHOWTIME_SYNC_CONCURRENCY.';
      jobRef.finishedAt = new Date().toISOString();
      jobRef.progress = jobRef.error;
      persistJob(jobRef);
      clearInterval(heartbeat);
      strapi.log.error(`[more-showtime-sync] job ${id} stale (no progress ${STALE_MS}ms)`);
    }
  }, HEARTBEAT_MS);

  const finish = (patch) => {
    Object.assign(jobRef, patch);
    persistJob(jobRef);
    clearInterval(heartbeat);
  };

  (async () => {
    try {
      const report = await syncShowtimesFromMore(strapi, {
        ...options,
        onProgress,
      });
      finish({
        status: 'completed',
        report,
        finishedAt: new Date().toISOString(),
        progress: report.message || 'Ολοκληρώθηκε',
        error: null,
      });
      strapi.log.info(`[more-showtime-sync] job ${id} completed (${report.durationMs}ms)`);
    } catch (e) {
      const msg = e?.message || String(e);
      finish({
        status: 'failed',
        error: msg,
        finishedAt: new Date().toISOString(),
        progress: `Αποτυχία: ${msg}`,
      });
      strapi.log.error(`[more-showtime-sync] job ${id} failed`, e);
    }
  })().catch((e) => {
    if (jobRef.status === 'running') {
      const msg = e?.message || String(e);
      finish({
        status: 'failed',
        error: msg,
        finishedAt: new Date().toISOString(),
        progress: `Αποτυχία: ${msg}`,
      });
      strapi.log.error(`[more-showtime-sync] job ${id} unhandled`, e);
    } else {
      clearInterval(heartbeat);
    }
  });

  return { started: true, job: publicJob(activeJob) };
}

module.exports = {
  getMoreShowtimeSyncJob,
  isMoreShowtimeSyncRunning,
  startMoreShowtimeSyncJob,
};
