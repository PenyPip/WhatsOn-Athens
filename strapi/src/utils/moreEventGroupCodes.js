'use strict';

function isVenueBundleCode(code) {
  return /cinema|kinematog|movietheater/i.test(String(code || ''));
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
  collectEventGroupCodes,
};
