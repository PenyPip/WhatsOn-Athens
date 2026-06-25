'use strict';

const AI_TIMEOUT_MS = Number(process.env.PROGRAM_IMPORT_AI_TIMEOUT_MS || 45_000);

function aiConfig() {
  const apiKey =
    process.env.PROGRAM_IMPORT_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '';
  const enabled =
    process.env.PROGRAM_IMPORT_AI_ENABLED !== 'false' && Boolean(apiKey.trim());
  return {
    enabled,
    apiKey: apiKey.trim(),
    model: process.env.PROGRAM_IMPORT_AI_MODEL || 'gpt-4o-mini',
    baseUrl: (process.env.PROGRAM_IMPORT_AI_BASE_URL || 'https://api.openai.com/v1').replace(
      /\/$/,
      '',
    ),
  };
}

function isAiEnabled() {
  return aiConfig().enabled;
}

function buildAthensDatetimeFromParts(dateStr, timeStr) {
  const dateMatch = String(dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const y = Number(dateMatch[1]);
  const m = Number(dateMatch[2]);
  const d = Number(dateMatch[3]);
  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);
  if (hh > 23 || mm > 59) return null;
  return new Date(
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+03:00`,
  );
}

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

      const dayLabel = datetime.toLocaleDateString('el-GR', { weekday: 'long' });
      const timeLabel = datetime.toLocaleTimeString('el-GR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

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
    const start = new Date(`${dr.start}T00:00:00+03:00`);
    const end = new Date(`${dr.end}T23:59:59+03:00`);
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

function buildSystemPrompt({ refYear, venueName, todayIso }) {
  return `Είσαι βοηθός εισαγωγής προγράμματος κινηματογράφου στο CMS.
Ανάλυσε ελεύθερο ελληνικό κείμενο (Facebook, email, site) και επέστρεψε ΜΟΝΟ έγκυρο JSON.

Κανόνες:
- Βρες τίτλους ταινιών και όλες τις προβολές (ημερομηνία + ώρα Europe/Athens).
- Ώρες: 24h, μορφή time "HH:MM" (π.χ. "17:20" όχι "17.20").
- Ημερομηνίες: μορφή date "YYYY-MM-DD".
- Αν το κείμενο δίνει εύρος (π.χ. 25/6–1/7), χρησιμοποίησε έτος ${refYear} εκτός αν αναφέρεται άλλο.
- Σημειώσεις (μεταγλωττισμένο, υποτιτλισμένο, παρουσία συντελεστών) στο πεδίο note.
- Μην εφευρίσκεις προβολές που δεν υπάρχουν στο κείμενο.
- Σήμερα: ${todayIso}. Κινηματογράφος: ${venueName || 'άγνωστος'}.

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

module.exports = {
  aiConfig,
  isAiEnabled,
  parseCinemaProgramTextWithAi,
  normalizeAiPayload,
};
