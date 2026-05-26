'use strict';

const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

function normalizeUrl(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  const match = s.match(URL_RE);
  if (!match?.[0]) return null;
  return match[0].replace(/[.,;]+$/g, '');
}

/** URL προγράμματος από το info (διαβάζεται μόνο — το πεδίο δεν αλλάζει). Όχι more_link. */
function resolveProgramUrl(venue) {
  if (!venue || typeof venue !== 'object') return null;
  return normalizeUrl(venue.info);
}

function isSafeProgramUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
      return false;
    }
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  resolveProgramUrl,
  isSafeProgramUrl,
};
