'use strict';

const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

/** URL προγράμματος: πρώτα στο χειροκίνητο κείμενο info (κάτω από ---), αλλιώς more_link. */
function extractProgramUrl(manualText, moreLink) {
  const manual = typeof manualText === 'string' ? manualText.trim() : '';
  const fromManual = manual.match(URL_RE);
  if (fromManual?.[0]) {
    return fromManual[0].replace(/[.,;]+$/g, '');
  }
  const link = typeof moreLink === 'string' ? moreLink.trim() : '';
  return link || null;
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
  extractProgramUrl,
  isSafeProgramUrl,
};
