'use strict';

function unmatchedTitleKey(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function pushUnique(list, value, max = 24) {
  const v = String(value ?? '').trim();
  if (!v) return list || [];
  const next = Array.isArray(list) ? list : [];
  if (next.includes(v)) return next;
  if (next.length >= max) return next;
  return [...next, v];
}

function normalizeVenueName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

const GREEK_TO_LATIN = {
  α: 'a',
  ά: 'a',
  β: 'v',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  έ: 'e',
  ζ: 'z',
  η: 'i',
  ή: 'i',
  θ: 'th',
  ι: 'i',
  ί: 'i',
  ϊ: 'i',
  ΐ: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'x',
  ο: 'o',
  ό: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'y',
  ύ: 'y',
  ϋ: 'y',
  ΰ: 'y',
  φ: 'f',
  χ: 'ch',
  ψ: 'ps',
  ω: 'o',
  ώ: 'o',
};

/** Slug από όνομα χώρου (μεταγραφή ελληνικών → λατινικά)· ποτέ με venue_id. */
function slugifyVenueName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => GREEK_TO_LATIN[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = {
  unmatchedTitleKey,
  pushUnique,
  normalizeVenueName,
  slugifyVenueName,
};
