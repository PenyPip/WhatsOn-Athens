'use strict';

const { parseCinemaProgramText } = require('./programTextParser');
const {
  isAiEnabled,
  parseCinemaProgramTextWithAi,
  parseCinemaProgramImagesWithAi,
} = require('./programTextAiParser');
const { isOcrAvailable, ocrProgramImagesToText } = require('./programTextOcr');
const { scorePlayTitleMatch } = require('./morePlayTitleMatch');

function buildRegexTextResult(regexResult, warnings, parseSource = 'regex') {
  return {
    ...regexResult,
    parseSource,
    warnings: [...new Set(warnings)],
  };
}

/** Συμπληρώνει κενές προβολές AI από regex (συχνό σε catalog paste με σύνοψη + «Ώρες προβολής»). */
function mergeMovieShowtimesFromRegex(aiMovies, regexMovies) {
  const usedRegex = new Set();
  return (aiMovies || []).map((ai) => {
    if (ai.showtimes?.length) return ai;
    let best = null;
    let bestScore = 0;
    for (let i = 0; i < (regexMovies || []).length; i += 1) {
      if (usedRegex.has(i)) continue;
      const rm = regexMovies[i];
      if (!rm?.showtimes?.length) continue;
      const score = scorePlayTitleMatch(ai.title, rm.title);
      if (score > bestScore) {
        bestScore = score;
        best = { rm, i };
      }
    }
    if (best && bestScore >= 0.45) {
      usedRegex.add(best.i);
      return {
        ...ai,
        scheduleText: best.rm.scheduleText || ai.scheduleText,
        showtimes: best.rm.showtimes,
      };
    }
    return ai;
  });
}

function enrichAiParseWithRegex(aiResult, text, { refYear, now }) {
  const regexResult = parseCinemaProgramText(text, { refYear, now });
  const aiShowtimeCount = (aiResult.movies || []).reduce(
    (n, m) => n + (m.showtimes?.length || 0),
    0,
  );
  if (aiShowtimeCount > 0) {
    return {
      ...aiResult,
      warnings: [
        ...(aiResult.aiNotes || []),
        'Ανάλυση με AI — έλεγξε προσεκτικά πριν την έγκριση.',
      ],
    };
  }

  const regexShowtimeCount = (regexResult.movies || []).reduce(
    (n, m) => n + (m.showtimes?.length || 0),
    0,
  );
  if (regexShowtimeCount === 0) {
    return {
      ...aiResult,
      warnings: [
        ...(aiResult.aiNotes || []),
        'Ανάλυση με AI — δεν εντοπίστηκαν ώρες ούτε από κανόνες.',
      ],
    };
  }

  const movies = mergeMovieShowtimesFromRegex(aiResult.movies, regexResult.movies);
  const mergedCount = movies.reduce((n, m) => n + (m.showtimes?.length || 0), 0);
  if (mergedCount === 0) {
    return buildRegexTextResult(
      regexResult,
      [
        ...(regexResult.warnings || []),
        'AI δεν εξήγαγε ώρες — χρησιμοποιήθηκαν κανόνες.',
      ],
      'regex',
    );
  }

  return {
    ...aiResult,
    movies,
    dateRange: aiResult.dateRange || regexResult.dateRange,
    parseSource: 'ai+regex',
    warnings: [
      ...(aiResult.aiNotes || []),
      'Ταινίες από AI, ώρες προβολών από κανόνες — έλεγξε προσεκτικά πριν την έγκριση.',
    ],
  };
}

/**
 * Ανάλυση από screenshot(s): AI vision → OCR → AI κείμενο → κανόνες.
 */
async function parseProgramFromImages(images, { refYear, venueName, now = new Date() } = {}) {
  const year = refYear ?? now.getFullYear();
  const warnings = [];
  let imageCount = Array.isArray(images) ? images.filter(Boolean).length : 0;

  if (isAiEnabled()) {
    const aiResult = await parseCinemaProgramImagesWithAi(images, {
      refYear: year,
      venueName,
      now,
    });
    if (aiResult && !aiResult.error && aiResult.movies?.length) {
      return {
        ...aiResult,
        warnings: [
          ...(aiResult.aiNotes || []),
          `Ανάλυση ${aiResult.imageCount || imageCount || 1} εικόνας με AI vision — έλεγξε προσεκτικά πριν την έγκριση.`,
        ],
      };
    }
    if (aiResult?.error) warnings.push(`AI vision: ${aiResult.error}`);
    if (aiResult?.imageCount) imageCount = aiResult.imageCount;
  }

  if (!isOcrAvailable()) {
    return {
      header: '',
      dateRange: null,
      movies: [],
      warnings: [
        ...warnings,
        'Για εικόνες χωρίς AI όρισε OPENAI_API_KEY ή εγκατάστησε tesseract.js.',
      ],
      parseSource: 'failed',
      imageCount,
    };
  }

  const ocr = await ocrProgramImagesToText(images);
  warnings.push(...(ocr.warnings || []));
  if (ocr.imageCount) imageCount = ocr.imageCount;

  if (!ocr.ok || !ocr.text) {
    return {
      header: '',
      dateRange: null,
      movies: [],
      warnings: [...warnings, ocr.error || 'Το OCR δεν ανέγνωσε κείμενο.'],
      parseSource: 'ocr_failed',
      imageCount,
    };
  }

  if (isAiEnabled()) {
    const aiText = await parseCinemaProgramTextWithAi(ocr.text, {
      refYear: year,
      venueName,
      now,
    });
    if (aiText && !aiText.error && aiText.movies?.length) {
      return {
        ...aiText,
        parseSource: 'ai_ocr',
        imageCount,
        ocrPreview: ocr.text.slice(0, 1200),
        warnings: [
          ...(aiText.aiNotes || []),
          ...warnings,
          'Εικόνα → OCR → AI — έλεγξε προσεκτικά πριν την έγκριση.',
        ],
      };
    }
    if (aiText?.error) warnings.push(`AI κείμενο: ${aiText.error}`);
  }

  const regexResult = parseCinemaProgramText(ocr.text, { refYear: year, now });
  return buildRegexTextResult(
    { ...regexResult, imageCount, ocrPreview: ocr.text.slice(0, 1200) },
    [
      ...warnings,
      ...(regexResult.warnings || []),
      `Ανάλυση ${imageCount} εικόνας με OCR + κανόνες — έλεγξε προσεκτικά.`,
    ],
    'ocr',
  );
}

/**
 * Ενιαία ανάλυση κειμένου: πρώτα AI (αν διαθέσιμο), μετά κανόνες.
 */
async function parseProgramText(text, { refYear, venueName, now = new Date(), preferAi = false } = {}) {
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
      return enrichAiParseWithRegex(aiResult, trimmed, { refYear: year, now });
    }
  }

  const regexResult = parseCinemaProgramText(trimmed, { refYear: year, now });
  const warnings = [...(regexResult.warnings || [])];

  if (aiResult?.error) {
    warnings.unshift(`AI δεν χρησιμοποιήθηκε (${aiResult.error}) — χρησιμοποιήθηκαν κανόνες.`);
  } else if (preferAi && isAiEnabled()) {
    warnings.unshift('AI δεν επέστρεψε αποτέλεσμα — χρησιμοποιήθηκαν κανόνες.');
  } else if (!isAiEnabled()) {
    warnings.unshift('Ανάλυση με κανόνες (AI απενεργοποιημένο — όρισε PROGRAM_IMPORT_AI_ENABLED=true για AI).');
  }

  return buildRegexTextResult(regexResult, warnings, 'regex');
}

module.exports = {
  parseProgramText,
  parseProgramFromImages,
  isAiEnabled,
  isOcrAvailable,
};
