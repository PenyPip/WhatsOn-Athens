'use strict';

const OCR_TIMEOUT_MS = Number(process.env.PROGRAM_IMPORT_OCR_TIMEOUT_MS || 120_000);

let workerPromise = null;

function isOcrAvailable() {
  try {
    require.resolve('tesseract.js');
    return true;
  } catch {
    return false;
  }
}

async function getOcrWorker() {
  if (!isOcrAvailable()) {
    throw new Error('Το πακέτο tesseract.js δεν είναι εγκατεστημένο.');
  }
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker(['ell', 'eng'], 1, {
        logger: () => {},
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

function normalizeImageBuffer(dataUrl) {
  const s = String(dataUrl || '').trim();
  const m = s.match(/^data:(image\/[a-z0-9+.-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (m) {
    return { mime: m[1].toLowerCase(), buffer: Buffer.from(m[2].replace(/\s/g, ''), 'base64') };
  }
  if (/^[a-z0-9+/=\s]+$/i.test(s)) {
    return { mime: 'image/jpeg', buffer: Buffer.from(s.replace(/\s/g, ''), 'base64') };
  }
  return null;
}

async function recognizeImageBuffer(worker, buffer, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('OCR timeout')), timeoutMs);
    worker
      .recognize(buffer)
      .then((result) => {
        clearTimeout(timer);
        resolve(String(result?.data?.text || '').trim());
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * OCR από screenshot(s) — επιστρέφει ενωμένο κείμενο (ελληνικά + αγγλικά).
 */
async function ocrProgramImagesToText(images, { timeoutMs = OCR_TIMEOUT_MS } = {}) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  if (!list.length) {
    return { ok: false, error: 'Δεν δόθηκαν εικόνες.', text: '' };
  }

  let worker;
  try {
    worker = await getOcrWorker();
  } catch (e) {
    return { ok: false, error: e?.message || String(e), text: '' };
  }

  const perImageTimeout = Math.max(15_000, Math.floor(timeoutMs / list.length));
  const parts = [];
  const warnings = [];

  for (let i = 0; i < list.length; i += 1) {
    const img = normalizeImageBuffer(list[i]);
    if (!img?.buffer?.length) {
      warnings.push(`Εικόνα ${i + 1}: μη έγκυρη μορφή.`);
      continue;
    }
    try {
      const text = await recognizeImageBuffer(worker, img.buffer, perImageTimeout);
      if (text) parts.push(text);
      else warnings.push(`Εικόνα ${i + 1}: δεν αναγνωρίστηκε κείμενο.`);
    } catch (e) {
      warnings.push(`Εικόνα ${i + 1}: ${e?.message || e}`);
    }
  }

  const text = parts.join('\n\n').trim();
  if (!text) {
    return {
      ok: false,
      error: warnings[0] || 'Το OCR δεν ανέγνωσε κείμενο από τις εικόνες.',
      text: '',
      warnings,
      imageCount: list.length,
    };
  }

  return {
    ok: true,
    text,
    warnings,
    imageCount: list.length,
  };
}

module.exports = {
  isOcrAvailable,
  ocrProgramImagesToText,
};
