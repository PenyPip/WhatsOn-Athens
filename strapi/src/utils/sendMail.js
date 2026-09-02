'use strict';

const nodemailer = require('nodemailer');

let cachedTransport = null;

function mailEnabled() {
  return process.env.THEATER_ALERT_EMAIL_ENABLED !== 'false' && Boolean(process.env.SMTP_HOST?.trim());
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
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
  return cachedTransport;
}

/**
 * @param {{ to: string; subject: string; text: string; html?: string }} msg
 */
async function sendMail(msg) {
  if (!mailEnabled()) {
    return { skipped: true, reason: 'mail_disabled' };
  }
  const transport = getTransport();
  if (!transport) return { skipped: true, reason: 'no_transport' };

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

  return { skipped: false, messageId: info.messageId };
}

module.exports = {
  mailEnabled,
  sendMail,
};
