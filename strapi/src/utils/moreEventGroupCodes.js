'use strict';

function isVenueBundleCode(code) {
  return /cinema|kinematog|movietheater/i.test(String(code || ''));
}

function extractEvgCodeFromText(raw) {
  const match = String(raw || '').match(/(evg_[a-z0-9_]+)/i);
  return match ? match[1] : '';
}

/**
 * Venue bundle κωδικοί σινεμά (evg_aiglecinema_…): event_group_code + evg_* μέσα στο more_link.
 * @param {object} venue
 * @returns {string[]}
 */
function collectVenueBundleCodes(venue) {
  const codes = [];
  const seen = new Set();

  const add = (raw) => {
    const code = String(raw || '').trim();
    if (!code || !isVenueBundleCode(code) || seen.has(code)) return;
    seen.add(code);
    codes.push(code);
  };

  add(venue?.event_group_code ?? venue?.eventGroupCode);
  add(extractEvgCodeFromText(venue?.more_link ?? venue?.moreLink));

  const groups = venue?.more_event_groups ?? venue?.moreEventGroups ?? [];
  for (const group of groups) {
    add(group?.code ?? group?.attributes?.code);
  }

  return codes;
}

/**
 * Venue bundle κωδικοί θεάτρου (evg_* στον χώρο, όχι σινεματικό evg_*).
 * @param {object} venue
 * @returns {string[]}
 */
function collectTheaterVenueBundleCodes(venue) {
  const codes = [];
  const seen = new Set();

  const add = (raw) => {
    const code = String(raw || '').trim();
    if (!code || seen.has(code) || isVenueBundleCode(code)) return;
    if (!/^evg_/i.test(code)) return;
    seen.add(code);
    codes.push(code);
  };

  add(venue?.event_group_code ?? venue?.eventGroupCode);
  add(extractEvgCodeFromText(venue?.more_link ?? venue?.moreLink));

  const groups = venue?.more_event_groups ?? venue?.moreEventGroups ?? [];
  for (const group of groups) {
    add(group?.code ?? group?.attributes?.code);
  }

  return codes;
}

/**
 * Όλοι οι per-movie κωδικοί μιας ταινίας: πρωτεύων event_group_code + repeatable more_event_groups.
 * @param {object} movie
 * @returns {string[]}
 */
function collectEventGroupCodes(movie) {
  const codes = [];
  const seen = new Set();

  const add = (raw) => {
    const code = String(raw || '').trim();
    if (!code || isVenueBundleCode(code) || seen.has(code)) return;
    seen.add(code);
    codes.push(code);
  };

  add(movie?.event_group_code ?? movie?.eventGroupCode);

  const groups = movie?.more_event_groups ?? movie?.moreEventGroups ?? [];
  for (const group of groups) {
    add(group?.code ?? group?.attributes?.code);
  }

  return codes;
}

module.exports = {
  isVenueBundleCode,
  extractEvgCodeFromText,
  collectEventGroupCodes,
  collectVenueBundleCodes,
  collectTheaterVenueBundleCodes,
};
