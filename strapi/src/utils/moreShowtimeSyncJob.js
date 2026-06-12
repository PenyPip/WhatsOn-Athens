'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { syncShowtimesFromMore } = require('./moreShowtimeSync');

const JOB_FILE = path.join(process.cwd(), 'data', 'more-showtime-sync-job.json');
const WORKER_LOG = path.join(process.cwd(), 'data', 'more-showtime-sync-worker.log');
const STALE_MS = Number(process.env.MORE_SHOWTIME_SYNC_STALE_MS || 20 * 60 * 1000);
const HEARTBEAT_MS = 30_000;
const START_DELAY_MS = Number(process.env.MORE_SHOWTIME_SYNC_START_DELAY_MS || 2500);
/** Χάρις πριν θεωρήσουμε ότι ο worker δεν ξεκίνησε (spawn + Strapi boot). */
const WORKER_BOOT_GRACE_MS = Number(process.env.MORE_SHOWTIME_SYNC_BOOT_GRACE_MS || 120_000);
const MAX_PERSISTED_ERRORS = Number(process.env.MORE_SHOWTIME_SYNC_MAX_PERSISTED_ERRORS || 200);
/** Worker (default): ξεχωριστή διεργασία — το admin/API μένει ζωντανό. In-process: MORE_SHOWTIME_SYNC_IN_PROCESS=true */
const USE_WORKER = process.env.MORE_SHOWTIME_SYNC_IN_PROCESS !== 'true';

/** @type {object | null} */
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
    workerPid: job.workerPid ?? null,
  };
}

function trimReportForDisk(report) {
  if (!report || typeof report !== 'object') return report;
  const errors = Array.isArray(report.errors) ? report.errors : null;
  if (!errors || errors.length <= MAX_PERSISTED_ERRORS) return report;
  return {
    ...report,
    errors: errors.slice(0, MAX_PERSISTED_ERRORS),
    errorsTruncated: errors.length - MAX_PERSISTED_ERRORS,
  };
}

function jobForDisk(job) {
  const pub = publicJob(job);
  if (job?.workerOptions) pub.workerOptions = job.workerOptions;
  if (job?.report) pub.report = trimReportForDisk(job.report);
  return pub;
}

function persistJob(job) {
  if (!job) return;
  try {
    ensureJobDir();
    fs.writeFileSync(JOB_FILE, JSON.stringify(jobForDisk(job)));
  } catch (e) {
    console.error('[more-showtime-sync] persist job failed', e?.message || e);
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

function loadFullJobFromDisk() {
  try {
    if (!fs.existsSync(JOB_FILE)) return null;
    return JSON.parse(fs.readFileSync(JOB_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

function markInterruptedIfNeeded(saved) {
  if (saved?.status !== 'running') return saved;
  if (isProcessAlive(saved.workerPid)) {
    return saved;
  }
  return {
    ...saved,
    status: 'failed',
    error:
      'Το sync διακόπηκε (επανεκκίνηση Strapi ή crash worker). Τρέξε ξανά — «Ξανά (force)».',
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

function isJobStale(job) {
  if (!job || job.status !== 'running') return false;
  const ref = job.lastProgressAt || job.startedAt;
  if (!ref) return false;
  return Date.now() - new Date(ref).getTime() > STALE_MS;
}

function failJob(jobRef, error) {
  const patch = {
    status: 'failed',
    error,
    finishedAt: new Date().toISOString(),
    progress: error,
    workerPid: null,
  };
  Object.assign(jobRef, patch);
  persistJob(jobRef);
  return publicJob(jobRef);
}

function failJobById(jobId, error) {
  const current = loadFullJobFromDisk();
  if (!current || current.id !== jobId) {
    if (activeJob?.id === jobId) return failJob(activeJob, error);
    return null;
  }
  activeJob = current;
  return failJob(current, error);
}

/** Μαρκάρει κολλημένο/ζombie job ώστε να επιτρέπεται νέο sync. */
function resetStuckMoreShowtimeSyncJob(reason) {
  const job = activeJob || loadPersistedJob();
  if (!job || job.status !== 'running') return null;
  const msg =
    reason ||
    'Το sync διακόπηκε (502/restart). Τρέξε ξανά — η προηγούμενη εργασία ακυρώθηκε.';
  if (activeJob) return failJob(activeJob, msg);
  const failed = {
    ...job,
    status: 'failed',
    error: msg,
    finishedAt: new Date().toISOString(),
    progress: msg,
  };
  activeJob = failed;
  persistJob(failed);
  return publicJob(failed);
}

function recoverDeadWorkerJob(job) {
  if (!job || job.status !== 'running' || !USE_WORKER) return job;

  const pid = job.workerPid;
  if (pid && isProcessAlive(pid)) return job;

  const ageMs = job.startedAt ? Date.now() - new Date(job.startedAt).getTime() : 0;
  if (!pid && ageMs < START_DELAY_MS + WORKER_BOOT_GRACE_MS) return job;

  const msg = pid
    ? 'Ο worker διακόπηκε (crash/OOM). Δες data/more-showtime-sync-worker.log και δοκίμασε «Ξανά (force)».'
    : 'Ο worker δεν ξεκίνησε εγκαίρως. Δες data/more-showtime-sync-worker.log (spawn/permissions).';

  if (activeJob?.id === job.id) return failJob(activeJob, msg);
  const failed = {
    ...job,
    status: 'failed',
    error: msg,
    finishedAt: new Date().toISOString(),
    progress: msg,
    workerPid: null,
  };
  activeJob = failed;
  persistJob(failed);
  return publicJob(failed);
}

function getMoreShowtimeSyncJob() {
  const disk = loadPersistedJob();
  if (disk && (!activeJob || activeJob.id === disk.id)) {
    activeJob = disk;
  }
  let job = activeJob ? publicJob(activeJob) : disk;
  job = recoverDeadWorkerJob(job);
  if (isJobStale(job)) {
    return resetStuckMoreShowtimeSyncJob(
      'Το sync κόλλησε χωρίς πρόοδο — ακυρώθηκε. Τρέξε ξανά (worker + χαμηλό concurrency).',
    );
  }
  return job;
}

function isMoreShowtimeSyncRunning() {
  const job = getMoreShowtimeSyncJob();
  return job?.status === 'running';
}

function touchJobProgress(jobRef, msg) {
  const now = new Date().toISOString();
  jobRef.lastProgressAt = now;
  if (msg) jobRef.progress = msg;
  persistJob(jobRef);
}

function patchJobOnDisk(jobId, patch) {
  const current = loadFullJobFromDisk();
  if (!current || current.id !== jobId) {
    if (current?.id && current.id !== jobId) {
      console.warn(
        `[more-showtime-sync] patch ignored job=${jobId} (disk has ${current.id}, status=${current.status})`,
      );
    }
    return null;
  }
  Object.assign(current, patch);
  activeJob = current;
  persistJob(current);
  return current;
}

function spawnSyncWorker(strapi, jobId) {
  const script = path.join(process.cwd(), 'scripts', 'sync-showtimes-worker.js');
  const heapMb = String(process.env.MORE_SHOWTIME_SYNC_WORKER_HEAP || '768').replace(/\D/g, '') || '768';
  ensureJobDir();
  const logFd = fs.openSync(WORKER_LOG, 'a');

  const child = spawn(
    process.execPath,
    [`--max-old-space-size=${heapMb}`, script, jobId],
    {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env, MORE_SHOWTIME_SYNC_WORKER: '1' },
    },
  );

  child.on('exit', (code, signal) => {
    setTimeout(() => {
      const job = loadFullJobFromDisk();
      if (!job || job.id !== jobId || job.status !== 'running') return;
      if (job.workerPid && child.pid && job.workerPid !== child.pid) return;

      if (code === 0) {
        failJobById(
          jobId,
          'Ο worker τερμάτισε χωρίς να σημειώσει ολοκλήρωση. Δες data/more-showtime-sync-worker.log.',
        );
        return;
      }

      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      failJobById(
        jobId,
        `Ο worker τερμάτισε (${detail}). Πιθανό OOM — αύξησε MORE_SHOWTIME_SYNC_WORKER_HEAP. Δες data/more-showtime-sync-worker.log.`,
      );
    }, 2500);
  });

  child.unref();

  patchJobOnDisk(jobId, { workerPid: child.pid ?? null });
  strapi.log.info(`[more-showtime-sync] worker spawned pid=${child.pid} job=${jobId} heap=${heapMb}MB`);
  return child.pid;
}

/**
 * Εκτέλεση sync μέσα στο worker process (φορτώνει δικό του Strapi instance).
 * @param {string} jobId
 */
async function runMoreShowtimeSyncWorker(jobId) {
  const saved = loadFullJobFromDisk();
  if (!saved || saved.id !== jobId) {
    console.error(`[sync-worker] Άγνωστο job ${jobId}`);
    process.exit(1);
  }
  if (saved.status !== 'running') {
    console.error(`[sync-worker] Job ${jobId} status=${saved.status} — skip`);
    process.exit(0);
  }

  const workerOptions = saved.workerOptions || {};
  let strapi;

  const onProgress = (msg) => {
    if (!msg) return;
    patchJobOnDisk(jobId, {
      status: 'running',
      lastProgressAt: new Date().toISOString(),
      progress: msg,
    });
  };

  try {
    console.log(`[sync-worker] boot Strapi job=${jobId}`);
    onProgress('Worker: εκκίνηση Strapi…');
    const Strapi = require('@strapi/strapi');
    strapi = await Strapi().load();
    onProgress('Worker: συγχρονισμός More…');

    const report = await syncShowtimesFromMore(strapi, {
      ...workerOptions,
      onProgress,
    });

    const patched = patchJobOnDisk(jobId, {
      status: 'completed',
      report,
      finishedAt: new Date().toISOString(),
      progress: report.message || 'Ολοκληρώθηκε',
      error: null,
      workerPid: null,
    });
    if (!patched) {
      console.error(
        `[sync-worker] completed but job file changed (job=${jobId}). Report not persisted — πιθανό force reset.`,
      );
      process.exitCode = 1;
    } else {
      console.log(`[sync-worker] completed job=${jobId} (${report.durationMs}ms)`);
    }
  } catch (e) {
    const msg = e?.message || String(e);
    const patched = patchJobOnDisk(jobId, {
      status: 'failed',
      error: msg,
      finishedAt: new Date().toISOString(),
      progress: `Αποτυχία: ${msg}`,
      workerPid: null,
    });
    if (!patched) {
      console.error(`[sync-worker] failed job=${jobId} but patch rejected`, e);
    } else {
      console.error(`[sync-worker] failed job=${jobId}`, e);
    }
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

function runSyncInProcess(strapi, jobRef, options, finish, onProgress) {
  const heartbeat = setInterval(() => {
    if (jobRef.status !== 'running') {
      clearInterval(heartbeat);
      return;
    }
    const ref = jobRef.lastProgressAt || jobRef.startedAt;
    if (ref && Date.now() - new Date(ref).getTime() > STALE_MS) {
      finish({
        status: 'failed',
        error:
          'Το sync κόλλησε χωρίς πρόοδο. Χρησιμοποίησε worker mode (default) ή μείωσε MORE_SHOWTIME_SYNC_CONCURRENCY.',
        finishedAt: new Date().toISOString(),
        progress: 'Κολλημένο',
      });
      clearInterval(heartbeat);
      strapi.log.error(`[more-showtime-sync] job ${jobRef.id} stale`);
    }
  }, HEARTBEAT_MS);

  (async () => {
    try {
      const report = await syncShowtimesFromMore(strapi, { ...options, onProgress });
      finish({
        status: 'completed',
        report,
        finishedAt: new Date().toISOString(),
        progress: report.message || 'Ολοκληρώθηκε',
        error: null,
      });
      strapi.log.info(`[more-showtime-sync] job ${jobRef.id} completed (${report.durationMs}ms)`);
    } catch (e) {
      const msg = e?.message || String(e);
      finish({
        status: 'failed',
        error: msg,
        finishedAt: new Date().toISOString(),
        progress: `Αποτυχία: ${msg}`,
      });
      strapi.log.error(`[more-showtime-sync] job ${jobRef.id} failed`, e);
    } finally {
      clearInterval(heartbeat);
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
    }
    clearInterval(heartbeat);
  });
}

/**
 * @returns {{ started: boolean, reason?: string, job: object | null }}
 */
function startMoreShowtimeSyncJob(strapi, options = {}) {
  if (activeJob?.status === 'running') {
    if (options.force === true || isJobStale(activeJob)) {
      resetStuckMoreShowtimeSyncJob(
        options.force === true ? 'Ακυρώθηκε χειροκίνητα — ξεκινά νέο sync.' : undefined,
      );
    } else {
      return { started: false, reason: 'already_running', job: publicJob(activeJob) };
    }
  }

  const diskRunning = loadPersistedJob();
  if (diskRunning?.status === 'running' && !options.force && !isJobStale(diskRunning)) {
    activeJob = diskRunning;
    return { started: false, reason: 'already_running', job: publicJob(diskRunning) };
  }

  const id = `sync-${Date.now()}`;
  const startedAt = new Date().toISOString();
  activeJob = {
    id,
    status: 'running',
    startedAt,
    lastProgressAt: startedAt,
    progress: 'Έναρξη συγχρονισμού (worker)…',
    report: null,
    error: null,
    workerOptions: {
      movieId: options.movieId,
      theaterShowId: options.theaterShowId,
    },
  };
  persistJob(activeJob);

  if (USE_WORKER) {
    setTimeout(() => {
      try {
        spawnSyncWorker(strapi, id);
        touchJobProgress(activeJob, 'Worker ξεκίνησε — συγχρονισμός More σε εξέλιξη…');
      } catch (e) {
        failJob(
          activeJob,
          e?.message || 'Αποτυχία εκκίνησης worker — έλεγξε logs data/more-showtime-sync-worker.log',
        );
        strapi.log.error('[more-showtime-sync] worker spawn failed', e);
      }
    }, START_DELAY_MS);
    return { started: true, job: publicJob(activeJob), mode: 'worker' };
  }

  const jobRef = activeJob;
  const onProgress = (msg) => {
    if (jobRef.status !== 'running' || !msg) return;
    touchJobProgress(jobRef, msg);
    if (typeof options.onProgress === 'function') options.onProgress(msg);
  };
  const finish = (patch) => {
    Object.assign(jobRef, patch);
    persistJob(jobRef);
  };

  setTimeout(() => {
    runSyncInProcess(strapi, jobRef, options, finish, onProgress);
  }, START_DELAY_MS);

  return { started: true, job: publicJob(activeJob), mode: 'in-process' };
}

module.exports = {
  getMoreShowtimeSyncJob,
  isMoreShowtimeSyncRunning,
  startMoreShowtimeSyncJob,
  resetStuckMoreShowtimeSyncJob,
  runMoreShowtimeSyncWorker,
  failJobById,
};
