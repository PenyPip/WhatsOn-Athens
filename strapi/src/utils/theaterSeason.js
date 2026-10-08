'use strict';

/** «2ος χρόνος» / «3η χρονιά» / «Β' χρόνος» — όχι μέρος του τίτλου. */
const SEASON_PHRASE =
  '((?:\\d{1,2})\\s*(?:[οΟόΌ][ςΣ]|[ηήΗΉ])\\s*[χΧ]ρ[οόΟΌoO]\\s*ν(?:[οόΟΌoO][ςΣ]|[ιίΙΊ][αάΑΆ])(?:\\s+[πΠ]αραστ[αάΑΆ]σεων)?|(?:ΣΤ|Στ|στ|[ΑΒΓΔΕαβγδε])\\s*[\'΄´’]\\s*[χΧ]ρ[οόΟΌoO]\\s*ν(?:[οόΟΌoO][ςΣ]|[ιίΙΊ][αάΑΆ])(?:\\s+[πΠ]αραστ[αάΑΆ]σεων)?)';

const TRAILING = new RegExp(
  `(?:\\s*[-–—·•|,]\\s*|\\s+)\\(?\\s*${SEASON_PHRASE}\\s*\\)?\\s*$`,
  'u',
);
const LEADING = new RegExp(
  `^\\(?\\s*${SEASON_PHRASE}\\s*\\)?\\s*(?:[-–—·•|,]\\s*|\\s+)`,
  'u',
);
const PAREN = new RegExp(`\\(\\s*${SEASON_PHRASE}\\s*\\)`, 'u');

const LETTER_YEAR = { Α: 1, Β: 2, Γ: 3, Δ: 4, Ε: 5, ΣΤ: 6 };

function normalizeSeasonYear(value) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isInteger(n) || n < 2 || n > 30) return null;
  return n;
}

function seasonYearFromPhrase(phrase) {
  const text = String(phrase || '').replace(/\s+/g, ' ').trim();
  const num = text.match(/^(\d{1,2})/u);
  if (num) return normalizeSeasonYear(Number(num[1]));
  const letter = text.match(/^(ΣΤ|Στ|στ|[ΑΒΓΔΕαβγδε])/u);
  if (!letter) return null;
  const key = letter[1].toLocaleUpperCase('el').normalize('NFC');
  return normalizeSeasonYear(LETTER_YEAR[key] || null);
}

function cleanupTitle(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—·•|,]+|[-–—·•|,]+$/g, '')
    .replace(/^\(+|\)+$/g, '')
    .trim();
}

/**
 * Βγάζει τον χρόνο από την άκρη του τίτλου ή από παρένθεση.
 * Αν μείνει τίτλος μικρότερος από 2 χαρακτήρες, δεν πειράζει το κείμενο.
 */
function splitTheaterSeasonTitle(raw) {
  const title = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!title) return { title: '', seasonYear: null };

  for (const re of [TRAILING, LEADING, PAREN]) {
    const match = title.match(re);
    if (!match) continue;
    const seasonYear = seasonYearFromPhrase(match[1]);
    if (!seasonYear) continue;
    const next = cleanupTitle(title.replace(match[0], ' '));
    if (next.length < 2) continue;
    return { title: next, seasonYear };
  }

  return { title, seasonYear: null };
}

function formatTheaterSeasonYear(value) {
  const year = normalizeSeasonYear(value);
  return year ? `${year}ος χρόνος` : '';
}

function theaterShowName(show) {
  const rawTitle = String(show?.title || '').trim();
  const peeled = splitTheaterSeasonTitle(rawTitle);
  const seasonYear = normalizeSeasonYear(show?.season_year ?? show?.seasonYear) || peeled.seasonYear;
  return {
    title: peeled.title || rawTitle,
    seasonYear,
    seasonLabel: formatTheaterSeasonYear(seasonYear),
  };
}

/** Αν ο τίτλος κουβαλάει «2ος χρόνος», τον καθαρίζει και γεμίζει το πεδίο όταν είναι κενό. */
function applyTheaterSeasonToData(data) {
  if (!data || typeof data !== 'object') return;
  if (typeof data.title !== 'string') return;
  const peeled = splitTheaterSeasonTitle(data.title);
  if (!peeled.seasonYear || !peeled.title || peeled.title === data.title) return;
  data.title = peeled.title;
  if (normalizeSeasonYear(data.season_year) == null) {
    data.season_year = peeled.seasonYear;
  }
}

module.exports = {
  normalizeSeasonYear,
  splitTheaterSeasonTitle,
  formatTheaterSeasonYear,
  theaterShowName,
  applyTheaterSeasonToData,
};
