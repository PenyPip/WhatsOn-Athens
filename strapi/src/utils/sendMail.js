'use strict';

const nodemailer = require('nodemailer');

let cachedTransport = null;

function flagEnabled(raw) {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function mailEnabled() {
  return flagEnabled(process.env.THEATER_ALERT_EMAIL_ENABLED) && Boolean(process.env.SMTP_HOST?.trim());
}

function mailStatus() {
  const host = process.env.SMTP_HOST?.trim() || '';
  const user = process.env.SMTP_USER?.trim() || '';
  const from = process.env.SMTP_FROM?.trim() || user || 'noreply@the37n.gr';
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    enabled: mailEnabled(),
    flag: String(process.env.THEATER_ALERT_EMAIL_ENABLED ?? ''),
    hasSmtpHost: Boolean(host),
    hasSmtpUser: Boolean(user),
    hasSmtpPass: Boolean(process.env.SMTP_PASS?.trim()),
    host: host || null,
    port,
    from,
    // χωρίς secrets
  };
}

function getTransport() {
  if (!mailEnabled()) return null;
  if (cachedTransport) return cachedTransport;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST.trim(),
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return cachedTransport;
}

/**
 * @param {{ to: string; subject: string; text: string; html?: string }} msg
 */
async function sendMail(msg) {
  if (!mailEnabled()) {
    return { skipped: true, reason: 'mail_disabled', status: mailStatus() };
  }
  const transport = getTransport();
  if (!transport) return { skipped: true, reason: 'no_transport', status: mailStatus() };

  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'noreply@the37n.gr';
  const replyTo = process.env.SMTP_REPLY_TO?.trim() || undefined;

  const info = await transport.sendMail({
    from,
    replyTo,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html || undefined,
  });

  return {
    skipped: false,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

async function verifySmtp() {
  if (!mailEnabled()) {
    return { ok: false, reason: 'mail_disabled', status: mailStatus() };
  }
  const transport = getTransport();
  if (!transport) return { ok: false, reason: 'no_transport', status: mailStatus() };
  try {
    await transport.verify();
    return { ok: true, status: mailStatus() };
  } catch (err) {
    return {
      ok: false,
      reason: 'smtp_verify_failed',
      error: err?.message || String(err),
      status: mailStatus(),
    };
  }
}

/** Καθαρίζει cached transporter (π.χ. μετά από αλλαγή env στο restart). */
function resetMailTransport() {
  cachedTransport = null;
}

module.exports = {
  mailEnabled,
  mailStatus,
  sendMail,
  verifySmtp,
  resetMailTransport,
};
