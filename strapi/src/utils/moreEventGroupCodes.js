'use strict';

function normalizeCatalogText(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function codeSlugRoot(code) {
  return String(code || '')
    .replace(/^evg_/i, '')
    .split('_')[0]
    .toLowerCase();
}

/** Κωδικοί evg_* που συνήθως αντιστοιχούν σε χώρο σινεμά (όχι ταινία). */
const CINEMA_VENUE_CODE_PREFIX =
  /^(therino|cine|sine|sinem|kinematographos|kinematografo|laistherino|olumpiontherino|sinekepos)/i;

function looksLikeMovieCatalogTitle(title) {
  const raw = String(title || '').trim();
  if (!raw) return false;
  if (/\s\|\s/.test(raw)) return true;
  if (/\(\d{4}\)/.test(raw)) return true;
  if (/\s·\s/.test(raw) && !/^cine\s/i.test(raw)) return true;
  if (raw.length > 72) return true;
  if (/αφιερωμα|αφιέρωμα|αφιερωματα|αφιερώματα/i.test(raw) && raw.length > 36) return true;
  return false;
}

function looksLikeCinemaVenueCatalogTitle(title) {
  if (looksLikeMovieCatalogTitle(title)) return false;
  const t = normalizeCatalogText(title);
  if (/^(θεριν[οός]|therino)\s/.test(t)) return true;
  if (/\s[-–]\s*θεριν[οός]?$/.test(t)) return true;
  if (/θεριν[οός]\s+κινηματογραφ/.test(t)) return true;
  if (/κινηματογραφος\s|kinematographos\s/.test(t) && t.length < 60) return true;
  if (/^(cine|sine|σινε|σινέ)\s/.test(t)) return true;
  if (/^(σινε|cine)\s*(μαρθα|μελινα|καρμεν)/.test(t)) return true;
  return false;
}

function isVenueBundleCode(code) {
  const s = String(code || '').toLowerCase();
  if (/cinema|kinematog|movietheater/i.test(s)) return true;
  if (/apollon|ribiera|europacinema|aiglecinema|athenaia/.test(codeSlugRoot(code))) return true;
  return CINEMA_VENUE_CODE_PREFIX.test(codeSlugRoot(code));
}

/**
 * Ταξινόμηση εγγραφής καταλόγου More (σελίδα cinema) — ταινία vs χώρος σινεμά.
 * @param {string} code
 * @param {string} title
 * @returns {'movie' | 'venue_bundle'}
 */
function classifyCinemaCatalogKind(code, title) {
  if (looksLikeMovieCatalogTitle(title)) return 'movie';
  if (isVenueBundleCode(code)) return 'venue_bundle';
  if (looksLikeCinemaVenueCatalogTitle(title)) return 'venue_bundle';
  return 'movie';
}

function extractEvgCodeFromText(raw) {
  const match = String(raw || '').match(/(evg_[a-z0-9_-]+)/i);
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
 * Όλοι οι κωδικοί εγγραφής CMS — primary + more_event_groups (ή προ-υπολογισμένο eventGroupCodes).
 * @param {object} entry
 * @returns {string[]}
 */
function resolveEventGroupCodesFromEntry(entry) {
  if (Array.isArray(entry?.eventGroupCodes) && entry.eventGroupCodes.length) {
    return entry.eventGroupCodes;
  }
  return collectEventGroupCodes(entry);
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
  classifyCinemaCatalogKind,
  looksLikeMovieCatalogTitle,
  looksLikeCinemaVenueCatalogTitle,
  extractEvgCodeFromText,
  collectEventGroupCodes,
  resolveEventGroupCodesFromEntry,
  collectVenueBundleCodes,
  collectTheaterVenueBundleCodes,
};
