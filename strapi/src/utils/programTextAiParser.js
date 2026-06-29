'use strict';

const AI_TIMEOUT_MS = Number(process.env.PROGRAM_IMPORT_AI_TIMEOUT_MS || 90_000);
const MAX_VISION_IMAGES = Number(process.env.PROGRAM_IMPORT_MAX_IMAGES || 4);
const MAX_IMAGE_BYTES = Number(process.env.PROGRAM_IMPORT_MAX_IMAGE_BYTES || 4 * 1024 * 1024);

function aiConfig() {
  const apiKey =
    process.env.PROGRAM_IMPORT_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '';
  const enabled =
    process.env.PROGRAM_IMPORT_AI_ENABLED === 'true' && Boolean(apiKey.trim());
  const visionModel =
    process.env.PROGRAM_IMPORT_VISION_MODEL ||
    process.env.PROGRAM_IMPORT_AI_MODEL ||
    'gpt-4o-mini';
  return {
    enabled,
    apiKey: apiKey.trim(),
    model: process.env.PROGRAM_IMPORT_AI_MODEL || 'gpt-4o-mini',
    visionModel,
    baseUrl: (process.env.PROGRAM_IMPORT_AI_BASE_URL || 'https://api.openai.com/v1').replace(
      /\/$/,
      '',
    ),
  };
}

function isAiEnabled() {
  return aiConfig().enabled;
}

const {
  buildAthensDatetimeFromParts,
  athensStartOfDay,
  athensEndOfDay,
  formatAthensWallClock,
} = require('./athensTime');

function normalizeAiPayload(raw, { refYear = new Date().getFullYear() } = {}) {
  const movies = [];
  const aiNotes = Array.isArray(raw?.notes) ? raw.notes.map(String) : [];

  for (const movie of raw?.movies || []) {
    const title = String(movie?.title || '').trim();
    if (!title) continue;

    const showtimes = [];
    for (const st of movie?.showtimes || []) {
      const datetime =
        buildAthensDatetimeFromParts(st?.date, st?.time) ||
        buildAthensDatetimeFromParts(st?.datetime?.slice(0, 10), st?.time);
      if (!datetime || Number.isNaN(datetime.getTime())) continue;

      const { dayLabel, timeLabel } = formatAthensWallClock(datetime);

      showtimes.push({
        dayLabel,
        timeLabel,
        datetime,
        note: st?.note ? String(st.note).trim() : null,
      });
    }

    movies.push({
      title,
      scheduleText: (movie?.showtimes || [])
        .map((st) => `${st?.date || ''} ${st?.time || ''}`.trim())
        .join(', '),
      showtimes,
    });
  }

  let dateRange = null;
  const dr = raw?.dateRange;
  if (dr?.start && dr?.end) {
    const [y1, m1, d1] = dr.start.split('-').map(Number);
    const [y2, m2, d2] = dr.end.split('-').map(Number);
    const start = athensStartOfDay(y1, m1, d1);
    const end = athensEndOfDay(y2, m2, d2);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      dateRange = { start, end, inferred: false };
    }
  }

  if (!dateRange && movies.length) {
    const allDates = movies.flatMap((m) => m.showtimes.map((s) => s.datetime.getTime()));
    if (allDates.length) {
      const min = Math.min(...allDates);
      const max = Math.max(...allDates);
      dateRange = {
        start: new Date(min),
        end: new Date(max),
        inferred: true,
      };
    }
  }

  return {
    header: String(raw?.header || '').trim(),
    dateRange,
    movies,
    parseSource: 'ai',
    aiNotes,
    refYear,
  };
}

function extractJsonFromResponse(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        return null;
      }
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildSystemPrompt({ refYear, venueName, todayIso, fromImage = false }) {
  const source = fromImage
    ? 'εικόνα/screenshot προγράμματος (Facebook, site, αφίσα κ.λπ.)'
    : 'ελεύθερο ελληνικό κείμενο (Facebook, email, site)';
  return `Είσαι βοηθός εισαγωγής προγράμματος κινηματογράφου στο CMS.
Ανάλυσε ${source} και επέστρεψε ΜΟΝΟ έγκυρο JSON.

Κανόνες:
- Βρες τίτλους ταινιών και όλες τις προβολές (ημερομηνία + ώρα Europe/Athens).
- Ώρες: 24h, μορφή time "HH:MM" (π.χ. "17:20" όχι "17.20").
- Ημερομηνίες: μορφή date "YYYY-MM-DD".
- Αν φαίνεται εύρος (π.χ. 25/6–1/7), χρησιμοποίησε έτος ${refYear} εκτός αν αναφέρεται άλλο.
- Αν δίνονται μόνο μέρες (Πέμπτη, Σάββατο), υπολόγισε την πραγματική ημερομηνία μέσα στο εύρος.
- Υποστήριξε μορφές όπως «Πέμπτη έως Κυριακή στις 20:50 & 22:45» και «25 Ιουνίου έως 1 Ιουλίου».
- Σημειώσεις (μεταγλωττισμένο, υποτιτλισμένο, παρουσία συντελεστών) στο πεδίο note.
- Μην εφευρίσκεις προβολές που δεν φαίνονται.
- Σήμερα: ${todayIso}. Κινηματογράφος: ${venueName || 'άγνωστος'}.
${fromImage ? '- Αν υπάρχουν πολλές εικόνες, συνένωσε το πρόγραμμα χωρίς διπλότυπα.' : ''}

Schema JSON:
{
  "header": "σύντομη περιγραφή περιόδου",
  "dateRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "notes": ["προειδοποιήσεις ή αμφιβολίες"],
  "movies": [
    {
      "title": "Τίτλος ταινίας όπως στο κείμενο",
      "showtimes": [
        { "date": "YYYY-MM-DD", "time": "HH:MM", "note": "προαιρετικό" }
      ]
    }
  ]
}`;
}

/**
 * Ανάλυση με LLM (OpenAI-compatible). Επιστρέφει null αν AI απενεργοποιημένο/αποτυχία.
 */
async function parseCinemaProgramTextWithAi(text, { refYear, venueName, now = new Date() } = {}) {
  const cfg = aiConfig();
  if (!cfg.enabled) return null;

  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  const todayIso = now.toISOString().slice(0, 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt({ refYear, venueName, todayIso }),
          },
          {
            role: 'user',
            content: trimmed,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`AI HTTP ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = extractJsonFromResponse(content);
    if (!parsed?.movies?.length) {
      throw new Error('Το AI δεν επέστρεψε ταινίες');
    }

    return normalizeAiPayload(parsed, { refYear });
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'AI timeout' : e?.message || String(e);
    return {
      error: msg,
      parseSource: 'ai_failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeImageDataUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;

  if (/^data:image\/[a-z+]+;base64,/i.test(s)) {
    const m = s.match(/^data:(image\/[a-z0-9+.-]+);base64,([a-z0-9+/=\s]+)$/i);
    if (!m) return null;
    const base64 = m[2].replace(/\s/g, '');
    return { mime: m[1].toLowerCase(), base64, dataUrl: `data:${m[1]};base64,${base64}` };
  }

  const base64 = s.replace(/\s/g, '');
  if (!/^[a-z0-9+/=]+$/i.test(base64)) return null;
  return {
    mime: 'image/jpeg',
    base64,
    dataUrl: `data:image/jpeg;base64,${base64}`,
  };
}

function estimateBase64Bytes(base64) {
  const len = String(base64 || '').replace(/\s/g, '').length;
  return Math.floor((len * 3) / 4);
}

function validateVisionImages(images) {
  const list = Array.isArray(images) ? images : images ? [images] : [];
  if (!list.length) {
    return { ok: false, error: 'Δεν δόθηκαν εικόνες.' };
  }
  if (list.length > MAX_VISION_IMAGES) {
    return { ok: false, error: `Μέγιστο ${MAX_VISION_IMAGES} εικόνες ανά ανάλυση.` };
  }

  const normalized = [];
  let totalBytes = 0;
  for (const raw of list) {
    const img = normalizeImageDataUrl(raw);
    if (!img) {
      return { ok: false, error: 'Μη έγκυρη εικόνα (αναμένεται JPEG/PNG/WebP base64).' };
    }
    const bytes = estimateBase64Bytes(img.base64);
    if (bytes > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: `Η εικόνα υπερβαίνει ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB — δοκίμασε μικρότερο screenshot.`,
      };
    }
    totalBytes += bytes;
    normalized.push(img);
  }

  if (totalBytes > MAX_IMAGE_BYTES * MAX_VISION_IMAGES) {
    return { ok: false, error: 'Πολύ μεγάλο συνολικό μέγεθος εικόνων.' };
  }

  return { ok: true, images: normalized };
}

/**
 * Ανάλυση προγράμματος από screenshot(s) με vision LLM.
 */
async function parseCinemaProgramImagesWithAi(images, { refYear, venueName, now = new Date() } = {}) {
  const cfg = aiConfig();
  if (!cfg.enabled) {
    return { error: 'AI απενεργοποιημένο — όρισε OPENAI_API_KEY.', parseSource: 'ai_failed' };
  }

  const validated = validateVisionImages(images);
  if (!validated.ok) {
    return { error: validated.error, parseSource: 'ai_failed' };
  }

  const todayIso = now.toISOString().slice(0, 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  const userContent = [
    {
      type: 'text',
      text:
        validated.images.length > 1
          ? `Διάβασε το πρόγραμμα από τις ${validated.images.length} εικόνες και επέστρεψε ενιαίο JSON.`
          : 'Διάβασε το πρόγραμμα από την εικόνα και επέστρεψε JSON.',
    },
    ...validated.images.map((img) => ({
      type: 'image_url',
      image_url: { url: img.dataUrl, detail: 'high' },
    })),
  ];

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.visionModel,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt({ refYear, venueName, todayIso, fromImage: true }),
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Vision AI HTTP ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = extractJsonFromResponse(content);
    if (!parsed?.movies?.length) {
      throw new Error('Το AI δεν βρήκε ταινίες στην εικόνα');
    }

    const result = normalizeAiPayload(parsed, { refYear });
    return {
      ...result,
      parseSource: 'ai_vision',
      imageCount: validated.images.length,
    };
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'AI timeout' : e?.message || String(e);
    return {
      error: msg,
      parseSource: 'ai_failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  aiConfig,
  isAiEnabled,
  parseCinemaProgramTextWithAi,
  parseCinemaProgramImagesWithAi,
  validateVisionImages,
  normalizeAiPayload,
  MAX_VISION_IMAGES,
};
