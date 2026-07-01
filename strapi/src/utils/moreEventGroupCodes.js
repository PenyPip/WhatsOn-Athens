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
 * Venue bundle κωδικοί χώρου CMS (σινεμά: evg_* bundle · θέατρο: evg_* χώρου).
 * @param {object} venue
 * @returns {string[]}
 */
function collectVenueEventGroupCodes(venue) {
  const type = String(venue?.type ?? venue?.venueType ?? '').trim();
  if (type === 'cinema') return collectVenueBundleCodes(venue);
  if (type === 'theater' || type === 'other') return collectTheaterVenueBundleCodes(venue);
  return [...new Set([...collectVenueBundleCodes(venue), ...collectTheaterVenueBundleCodes(venue)])];
}

function resolveVenueEventGroupCodesFromEntry(entry) {
  if (Array.isArray(entry?.eventGroupCodes) && entry.eventGroupCodes.length) {
    return entry.eventGroupCodes;
  }
  return collectVenueEventGroupCodes(entry);
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

/** More.com venueId — κανονικοποίηση για σύγκριση CMS ↔ More. */
function normalizeMoreVenueId(raw) {
  return String(raw ?? '').trim();
}

/**
 * Λίστα More venueId από CMS (κενό = όλα). Υποστηρίζει «3394,3395» για πολυαίθουσα.
 * @returns {string[] | null} null = χωρίς φίλτρο
 */
function parseMoreVenueIdAllowList(raw) {
  const s = normalizeMoreVenueId(raw);
  if (!s) return null;
  const parts = s.split(/[\s,;|]+/).map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : null;
}

function moreVenueIdMatchesAllowList(moreVenueId, allowList) {
  if (allowList === null) return true;
  if (!allowList.length) return true;
  const id = String(moreVenueId ?? '').trim();
  if (!id) return true;
  return allowList.some((expected) => {
    if (expected === id) return true;
    const a = Number(expected);
    const b = Number(id);
    return Number.isFinite(a) && Number.isFinite(b) && a === b;
  });
}

/** More venueName τύπου «Cineplex 2», «Αίθουσα 1» — όχι ξεχωριστός CMS χώρος. */
function isMoreAuditoriumHallLabel(label) {
  const t = normalizeCatalogText(label);
  if (!t) return false;
  if (/^(αιθουσα|aithousa|hall|screen|auditorium)\s*\d+$/.test(t)) return true;
  if (/^cineplex\s*\d+$/.test(t)) return true;
  if (/\bcineplex\s*\d+$/.test(t)) return true;
  return false;
}

/**
 * Όνομα κύριου χώρου από More venueName («… - Αίθουσα 2», «… Cineplex - … Cineplex 3»).
 * @returns {string} parent name ή '' αν δεν φαίνεται αίθουσα
 */
function deriveParentVenueNameFromMoreEventName(raw) {
  const name = String(raw || '').trim();
  if (!name) return '';

  const parts = name.split(/\s[-–]\s+/);
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1].trim();
    if (isMoreAuditoriumHallLabel(tail)) {
      return parts.slice(0, -1).join(' - ').trim();
    }
    const tailNorm = normalizeCatalogText(tail.replace(/\s*\d+\s*$/, ''));
    const headNorm = normalizeCatalogText(parts[0]);
    if (tailNorm && headNorm && tailNorm === headNorm) {
      return parts[0].trim();
    }
  }
  return '';
}

function isMoreAuditoriumVenueName(name) {
  const full = String(name || '').trim();
  if (!full) return false;
  const parent = deriveParentVenueNameFromMoreEventName(full);
  return Boolean(parent && parent !== full);
}

/**
 * More event.venueId ↔ CMS venue. Σε bundle sync (evg_* χώρου) δεν φιλτράρουμε ανά αίθουσα.
 */
function eventMatchesVenueForCmsVenue(event, venue, { bundleSync = false } = {}) {
  if (bundleSync) {
    const hasBundle =
      collectVenueBundleCodes(venue).length > 0 ||
      collectTheaterVenueBundleCodes(venue).length > 0;
    if (hasBundle) return true;
  }
  const allowList = parseMoreVenueIdAllowList(venue?.venue_id ?? venue?.venueId);
  return moreVenueIdMatchesAllowList(event?.venueId, allowList);
}

/** Παραλλαγές κλειδιού (π.χ. "3975" / 3975) για αναζήτηση venue_id στο CMS. */
function moreVenueIdLookupKeys(raw) {
  const id = normalizeMoreVenueId(raw);
  if (!id) return [];
  const keys = new Set([id]);
  const num = Number(id);
  if (Number.isFinite(num)) {
    keys.add(String(num));
    keys.add(String(Math.trunc(num)));
  }
  return [...keys];
}

function collectVenueSupplementalMovieCodes(venue, existingBundleCodes = []) {
  const seen = new Set(existingBundleCodes);
  const codes = [];
  const add = (raw) => {
    const code = String(raw || '').trim();
    if (!code || !/^evg_/i.test(code) || seen.has(code) || isVenueBundleCode(code)) return;
    seen.add(code);
    codes.push(code);
  };
  for (const g of venue?.more_event_groups ?? venue?.moreEventGroups ?? []) {
    add(g?.code ?? g?.attributes?.code);
  }
  return codes;
}

/** Bundle χώρου + πρόσθετοι κωδικοί ταινιών (more_event_groups) για sync προβολών. */
function collectVenueAllSyncCodes(venue) {
  const bundle = collectVenueBundleCodes(venue);
  return [...bundle, ...collectVenueSupplementalMovieCodes(venue, bundle)];
}

module.exports = {
  normalizeMoreVenueId,
  moreVenueIdLookupKeys,
  parseMoreVenueIdAllowList,
  moreVenueIdMatchesAllowList,
  eventMatchesVenueForCmsVenue,
  isMoreAuditoriumHallLabel,
  isMoreAuditoriumVenueName,
  deriveParentVenueNameFromMoreEventName,
  isVenueBundleCode,
  classifyCinemaCatalogKind,
  looksLikeMovieCatalogTitle,
  looksLikeCinemaVenueCatalogTitle,
  extractEvgCodeFromText,
  collectEventGroupCodes,
  resolveEventGroupCodesFromEntry,
  collectVenueBundleCodes,
  collectVenueSupplementalMovieCodes,
  collectVenueAllSyncCodes,
  collectTheaterVenueBundleCodes,
  collectVenueEventGroupCodes,
  resolveVenueEventGroupCodesFromEntry,
};
