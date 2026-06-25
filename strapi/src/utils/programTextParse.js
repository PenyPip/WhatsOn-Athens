'use strict';

const { parseCinemaProgramText } = require('./programTextParser');
const {
  isAiEnabled,
  parseCinemaProgramTextWithAi,
  parseCinemaProgramImagesWithAi,
} = require('./programTextAiParser');
const { isOcrAvailable, ocrProgramImagesToText } = require('./programTextOcr');

function buildRegexTextResult(regexResult, warnings, parseSource = 'regex') {
  return {
    ...regexResult,
    parseSource,
    warnings: [...new Set(warnings)],
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
    warnings.unshift(`AI δεν χρησιμοποιήθηκε (${aiResult.error}) — χρησιμοποιήθηκαν κανόνες.`);
  } else if (preferAi && isAiEnabled()) {
    warnings.unshift('AI δεν επέστρεψε αποτέλεσμα — χρησιμοποιήθηκαν κανόνες.');
  } else if (!isAiEnabled()) {
    warnings.unshift('Ανάλυση με κανόνες (χωρίς API key) — δοκίμασε δομημένο κείμενο ή όρισε OPENAI_API_KEY για AI.');
  }

  return buildRegexTextResult(regexResult, warnings, 'regex');
}

module.exports = {
  parseProgramText,
  parseProgramFromImages,
  isAiEnabled,
  isOcrAvailable,
};
