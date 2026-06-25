'use strict';

const { parseCinemaProgramText } = require('./programTextParser');
const { isAiEnabled, parseCinemaProgramTextWithAi } = require('./programTextAiParser');

/**
 * Ενιαία ανάλυση: πρώτα AI (αν διαθέσιμο), μετά regex fallback.
 */
async function parseProgramText(text, { refYear, venueName, now = new Date(), preferAi = true } = {}) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return {
      header: '',
      dateRange: null,
      movies: [],
      warnings: ['Κενό κείμενο.'],
      parseSource: 'none',
    };
  }

  const year = refYear ?? now.getFullYear();
  let aiResult = null;

  if (preferAi && isAiEnabled()) {
    aiResult = await parseCinemaProgramTextWithAi(trimmed, {
      refYear: year,
      venueName,
      now,
    });
    if (aiResult && !aiResult.error && aiResult.movies?.length) {
      return {
        ...aiResult,
        warnings: [
          ...(aiResult.aiNotes || []),
          'Ανάλυση με AI — έλεγξε προσεκτικά πριν την έγκριση.',
        ],
      };
    }
  }

  const regexResult = parseCinemaProgramText(trimmed, { refYear: year, now });
  const warnings = [...(regexResult.warnings || [])];

  if (aiResult?.error) {
    warnings.unshift(`AI δεν χρησιμοποιήθηκε (${aiResult.error}) — χρησιμοποιήθηκε κανόνες.`);
  } else if (preferAi && isAiEnabled()) {
    warnings.unshift('AI δεν επέστρεψε αποτέλεσμα — χρησιμοποιήθηκαν κανόνες.');
  }

  return {
    ...regexResult,
    parseSource: 'regex',
    warnings,
  };
}

module.exports = {
  parseProgramText,
  isAiEnabled,
};
