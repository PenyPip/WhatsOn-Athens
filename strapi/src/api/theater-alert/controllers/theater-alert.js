'use strict';

const {
  mailEnabled,
  mailStatus,
  sendMail,
  verifySmtp,
} = require('../../../utils/sendMail');
const {
  processRecentTheaterPerformances,
  getProfileNotifications,
} = require('../../../utils/theaterShowNotifications');

module.exports = {
  async status(ctx) {
    const smtp = await verifySmtp();
    ctx.body = {
      ok: true,
      mail: mailStatus(),
      smtp,
      hint: smtp.ok
        ? 'Το SMTP απαντά. Αν δεν έρχονται mail, τρέξε process-recent ή έλεγξε follow/αγαπημένα.'
        : 'SMTP verify απέτυχε ή το mail είναι κλειστό — δες smtp.error / mail.flag.',
    };
  },

  /** Στέλνει δοκιμαστικό mail στον admin ή στο ?to= */
  async test(ctx) {
    const body = ctx.request.body ?? {};
    const to =
      String(body.to || ctx.query.to || ctx.state?.admin?.email || '')
        .trim()
        .toLowerCase();
    if (!to || !to.includes('@')) {
      ctx.status = 400;
      ctx.body = { ok: false, error: 'Δώσε έγκυρο email στο body.to ή query to=' };
      return;
    }

    if (!mailEnabled()) {
      ctx.status = 400;
      ctx.body = {
        ok: false,
        error: 'Mail disabled — βάλε THEATER_ALERT_EMAIL_ENABLED=true και κάνε restart Strapi.',
        mail: mailStatus(),
      };
      return;
    }

    try {
      const result = await sendMail({
        to,
        subject: '37°N — δοκιμαστικό email ειδοποιήσεων',
        text:
          'Αυτό είναι δοκιμαστικό μήνυμα από το 37°N.\n\n' +
          'Αν το βλέπεις, το SMTP δουλεύει.\n',
        html:
          '<p>Αυτό είναι <strong>δοκιμαστικό</strong> μήνυμα από το 37°N.</p>' +
          '<p>Αν το βλέπεις, το SMTP δουλεύει.</p>',
      });
      strapi.log.info(`[theater-alert] test mail to=${to} messageId=${result.messageId || '-'}`);
      ctx.body = { ok: true, to, result, mail: mailStatus() };
    } catch (err) {
      strapi.log.warn(`[theater-alert] test mail failed to=${to}: ${err?.message || err}`);
      ctx.status = 502;
      ctx.body = {
        ok: false,
        error: err?.message || String(err),
        mail: mailStatus(),
      };
    }
  },

  /**
   * Επανεκτέλεση alerts για πρόσφατες παραστάσεις (catch-up μετά από deploy).
   * body.hours = lookback (default 168 = 7 ημέρες, ίδιο παράθυρο με in-app).
   */
  async processRecent(ctx) {
    const body = ctx.request.body ?? {};
    const hours = Math.min(24 * 14, Math.max(1, Number(body.hours ?? ctx.query.hours ?? 168) || 168));
    const sinceMs = hours * 60 * 60 * 1000;

    if (!mailEnabled()) {
      ctx.status = 400;
      ctx.body = {
        ok: false,
        error: 'Mail disabled — THEATER_ALERT_EMAIL_ENABLED πρέπει να είναι true.',
        mail: mailStatus(),
      };
      return;
    }

    try {
      const result = await processRecentTheaterPerformances(strapi, { sinceMs });
      strapi.log.info(
        `[theater-alert] process-recent hours=${hours} emailsSent=${result.emailsSent} shows=${result.shows} venueEmails=${result.venueEmails || 0}`,
      );
      ctx.body = {
        ok: true,
        hours,
        ...result,
        mail: mailStatus(),
      };
    } catch (err) {
      strapi.log.error('[theater-alert] process-recent', err);
      ctx.status = 500;
      ctx.body = { ok: false, error: err?.message || String(err) };
    }
  },

  /** Διαγνωστικό: τι θα έβλεπε το προφίλ ενός χρήστη (χωρίς αποστολή). */
  async previewForUser(ctx) {
    const userId = Number(ctx.request.body?.userId || ctx.query.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      ctx.status = 400;
      ctx.body = { ok: false, error: 'Δώσε userId' };
      return;
    }
    const notifications = await getProfileNotifications(strapi, userId);
    ctx.body = {
      ok: true,
      userId,
      mail: mailStatus(),
      notifications,
      note: 'In-app ειδοποιήσεις. Email: follow παραστάσεις + αγαπημένα θέατρα (αν mail enabled).',
    };
  },
};
