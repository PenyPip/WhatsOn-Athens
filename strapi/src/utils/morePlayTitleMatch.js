'use strict';

/**
 * Λατινικά ομόγραφα → ελληνικά (πεζά, μετά το toLowerCase).
 * Το More συχνά γράφει ελληνικούς τίτλους με λατινικά γράμματα που μοιάζουν ίδια
 * (π.χ. «Τηλεφωνήσατε Aσφάλεια» με λατινικό A). Εφαρμόζεται και στις δύο πλευρές,
 * οπότε η αντιστοίχιση παραμένει συνεπής για καθαρά λατινικούς τίτλους.
 */
const LATIN_TO_GREEK_HOMOGLYPH = {
  a: 'α',
  b: 'β',
  e: 'ε',
  z: 'ζ',
  h: 'η',
  i: 'ι',
  k: 'κ',
  m: 'μ',
  n: 'ν',
  o: 'ο',
  p: 'ρ',
  t: 'τ',
  u: 'υ',
  y: 'υ',
  x: 'χ',
};

function foldHomoglyphs(text) {
  let out = '';
  for (const ch of text) {
    out += LATIN_TO_GREEK_HOMOGLYPH[ch] ?? ch;
  }
  return out;
}

function normalizeText(raw) {
  return foldHomoglyphs(
    String(raw ?? '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase(),
  )
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function compactText(raw) {
  return normalizeText(raw).replace(/\s+/g, '');
}

function stripParenthetical(title) {
  return String(title || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parentheticalParts(title) {
  const parts = [];
  const s = String(title || '');
  for (const m of s.matchAll(/\(([^)]+)\)/g)) {
    const inner = m[1]?.trim();
    if (inner) parts.push(inner);
  }
  return parts;
}

function playTitleVariants(playTitle) {
  const s = String(playTitle || '').trim();
  const variants = new Set([s, stripParenthetical(s), ...parentheticalParts(s)].filter(Boolean));
  return [...variants];
}

function cmsTitleVariants(cmsTitle) {
  const s = String(cmsTitle || '').trim();
  const variants = new Set([s, stripParenthetical(s), ...parentheticalParts(s)].filter(Boolean));
  return [...variants];
}

/**
 * Σύγκριση τίτλου CMS ↔ play-title από More venue page.
 * @returns {number} 0–1
 */
function scorePlayTitleMatch(cmsTitle, playTitle) {
  const playVariants = playTitleVariants(playTitle);
  let best = 0;

  for (const cms of cmsTitleVariants(cmsTitle)) {
    const nc = compactText(cms);
    const nw = normalizeText(cms);
    if (!nc) continue;

    for (const play of playVariants) {
      const moreCompact = compactText(play);
      const nt = normalizeText(play);
      if (!moreCompact || !nt) continue;

      if (nc === moreCompact || nw === nt) best = Math.max(best, 1);
      else {
        const [shorter, longer] =
          nc.length <= moreCompact.length ? [nc, moreCompact] : [moreCompact, nc];
        if (
          shorter.length >= 10 &&
          shorter.length / longer.length >= 0.55 &&
          longer.includes(shorter)
        ) {
          best = Math.max(best, 0.92);
        } else if (nw.length >= 12 && nt.length >= 12 && (nt.includes(nw) || nw.includes(nt))) {
          best = Math.max(best, 0.85);
        } else {
          const words = nw.split(' ').filter((w) => w.length > 3);
          const hits = words.filter((w) => nt.includes(w)).length;
          if (words.length >= 2 && hits >= 2) {
            best = Math.max(best, 0.7 + (hits / words.length) * 0.15);
          }
        }
      }
    }
  }

  return best;
}

const MIN_PLAY_TITLE_MATCH = Number(process.env.MORE_PLAY_TITLE_MATCH_MIN || 0.85);

/**
 * @param {string} playTitle
 * @param {Array<{ id: number, title: string, originalTitle?: string, slug?: string, contentType?: string }>} cmsItems
 * @param {{ minScore?: number }} options
 */
function findBestCmsMatchByPlayTitle(playTitle, cmsItems, options = {}) {
  const minScore = options.minScore ?? MIN_PLAY_TITLE_MATCH;
  let best = null;

  for (const item of cmsItems || []) {
    const title = item.title || item.name || '';
    const originalTitle = item.originalTitle ?? item.original_title ?? '';
    const scores = [
      scorePlayTitleMatch(title, playTitle),
      originalTitle ? scorePlayTitleMatch(originalTitle, playTitle) : 0,
      item.slug ? scorePlayTitleMatch(item.slug.replace(/-/g, ' '), playTitle) : 0,
    ];
    const score = Math.max(...scores);
    if (score < minScore) continue;
    if (!best || score > best.score) {
      best = {
        cmsId: item.id,
        cmsTitle: title,
        contentType: item.contentType || 'movie',
        score: Number(score.toFixed(3)),
      };
    }
  }

  return best;
}

/** Κανονικοποίηση εγγραφής CMS (Strapi snake_case) για title matching από scrape. */
function mapCmsRowForPlayTitleMatch(row, contentType = 'movie') {
  return {
    id: row?.id,
    title: row?.title ?? row?.name ?? '',
    slug: row?.slug ?? '',
    originalTitle: row?.originalTitle ?? row?.original_title ?? '',
    contentType,
  };
}

module.exports = {
  MIN_PLAY_TITLE_MATCH,
  normalizeText,
  compactText,
  scorePlayTitleMatch,
  findBestCmsMatchByPlayTitle,
  mapCmsRowForPlayTitleMatch,
};
