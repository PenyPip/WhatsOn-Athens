'use strict';

const ATHENS_TZ = 'Europe/Athens';
const { syncAllCinemaVenues } = require('../src/api/venue/services/program-status');

const ATHENS_WEEKDAY = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Ώρα & μέρα εβδομάδας στο Europe/Athens (για παράθυρο ωριαίου sync). */
function athensDayHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ATHENS_TZ,
    weekday: 'long',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sunday';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  return { dow: ATHENS_WEEKDAY[weekday] ?? 0, hour };
}

/** Τρίτη & Τετάρτη όλη μέρα, Πέμπτη μέχρι 12:00 (πρωί). */
function isHourlyProgramWindow(now = new Date()) {
  const { dow, hour } = athensDayHour(now);
  if (dow === 2 || dow === 3) return true;
  if (dow === 4 && hour < 12) return true;
  return false;
}

/**
 * Κάθε Σάββατο 14:00: updated → false (ολοκλήρωσα), needs_update από προβολές επόμενης εβδομάδας.
 */
async function resetCinemaProgramUpdated(strapi) {
  const summary = await syncAllCinemaVenues(strapi, { resetManualCompleted: true, logChange: false });
  strapi.log.info(
    `[cron] Σάββατο 14:00 ${ATHENS_TZ}: ${summary.missing} needs_update, ${summary.complete} με προβολές, ${summary.pendingManual} χωρίς «ολοκλήρωσα»`,
  );
}

/** Μία φορά την ημέρα — needs_update + info (updated χειροκίνητο). */
async function dailyProgramStatusSync(strapi) {
  const summary = await syncAllCinemaVenues(strapi, { logChange: true });
  strapi.log.info(
    `[cron] daily 09:00 ${ATHENS_TZ}: ${summary.complete} με προβολές, ${summary.missing} needs_update`,
  );
}

/** Ωριαία Τρίτη–Τετάρτη & Πέμπτη πρωί (κλήση μόνο μέσα στο παράθυρο). */
async function hourlyProgramStatusSync(strapi) {
  if (!isHourlyProgramWindow()) {
    return;
  }
  const { dow, hour } = athensDayHour();
  const summary = await syncAllCinemaVenues(strapi, { logChange: true });
  strapi.log.info(
    `[cron] hourly (dow=${dow} h=${hour} ${ATHENS_TZ}): ${summary.complete} OK, ${summary.missing} needs_update`,
  );
}

module.exports = {
  dailyProgramStatusSync: {
    task: async ({ strapi }) => {
      try {
        await dailyProgramStatusSync(strapi);
      } catch (err) {
        strapi.log.error('[cron] dailyProgramStatusSync απέτυχε', err);
      }
    },
    options: {
      rule: '0 9 * * *',
      tz: ATHENS_TZ,
    },
  },
  hourlyProgramStatusSync: {
    task: async ({ strapi }) => {
      try {
        await hourlyProgramStatusSync(strapi);
      } catch (err) {
        strapi.log.error('[cron] hourlyProgramStatusSync απέτυχε', err);
      }
    },
    options: {
      /** Κάθε ώρα — το task φιλτράρει Τρίτη, Τετάρτη & Πέμπτη πριν τις 12:00. */
      rule: '0 * * * *',
      tz: ATHENS_TZ,
    },
  },
  resetCinemaProgramUpdated: {
    task: async ({ strapi }) => {
      try {
        await resetCinemaProgramUpdated(strapi);
      } catch (err) {
        strapi.log.error('[cron] resetCinemaProgramUpdated απέτυχε', err);
      }
    },
    options: {
      rule: '0 14 * * 6',
      tz: ATHENS_TZ,
    },
  },
};
