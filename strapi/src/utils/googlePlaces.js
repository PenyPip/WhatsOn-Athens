'use strict';

const CACHE_TTL_MS = 60 * 60 * 1000;
/** @type {Map<string, { expires: number, data: object }>} */
const reviewCache = new Map();

/** Εξαγωγή Place ID / Maps CID από πλήρες URL (μετά redirect). */
function extractPlaceIdFromMapsUrl(urlString) {
  const s = typeof urlString === 'string' ? urlString : '';
  if (!s) return null;

  try {
    const u = new URL(s);
    const q = u.searchParams.get('place_id');
    if (q) return decodeURIComponent(q.replace(/\+/g, ' ')).trim();
  } catch {
    /* όχι απόλυτο URL */
  }

  const chij = s.match(/(ChI[a-zA-Z0-9_-]{20,})/);
  if (chij?.[1]) return chij[1];

  const fromBang = s.match(/!1s(0x[a-fA-F0-9]+:0x[a-fA-F0-9]+)/);
  if (fromBang?.[1]) return fromBang[1];

  const hexPair = s.match(/(0x[a-fA-F0-9]+:0x[a-fA-F0-9]+)/);
  if (hexPair?.[1]) return hexPair[1];

  return null;
}

function normalizeGooglePlaceId(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  if (/^ChI[a-zA-Z0-9_-]+$/.test(s)) return s;
  return extractPlaceIdFromMapsUrl(s) || s;
}

function isMapsShareLink(s) {
  return /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps|google\.com\/maps|maps\.google\.)/i.test(
    s,
  );
}

/**
 * Δέχεται ChIJ…, πλήρες Maps URL ή share link (maps.app.goo.gl) — ακολουθεί redirect.
 * @param {string} raw
 * @returns {Promise<string | null>}
 */
async function resolveGooglePlaceIdInput(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;

  if (/^ChI[a-zA-Z0-9_-]+$/.test(s)) return s;

  const fromText = extractPlaceIdFromMapsUrl(s);
  if (fromText) return fromText;

  if (isMapsShareLink(s) || s.includes('google.com/maps') || s.includes('maps.app')) {
    try {
      const href = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      const res = await fetch(href, {
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Whatson-CMS/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      const fromFinal = extractPlaceIdFromMapsUrl(res.url);
      if (fromFinal) return fromFinal;
    } catch (e) {
      /* fallback παρακάτω */
    }
  }

  const fromQuery = s.match(/[?&]place_id=([^&]+)/i);
  if (fromQuery?.[1]) return decodeURIComponent(fromQuery[1].replace(/\+/g, ' ')).trim();

  return null;
}

/**
 * @param {string} placeIdInput
 */
async function fetchGooglePlaceReviews(placeIdInput) {
  const id = await resolveGooglePlaceIdInput(placeIdInput);
  const empty = {
    reviews: [],
    rating: null,
    userRatingCount: null,
    googleMapsUri: null,
    placeName: null,
  };
  if (!id) return empty;

  const cached = reviewCache.get(id);
  if (cached && cached.expires > Date.now()) return cached.data;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return empty;
  }

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=el`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,reviews',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google Places ${res.status}: ${errText.slice(0, 200)}`);
  }

  const place = await res.json();
  const data = {
    placeName: typeof place.displayName?.text === 'string' ? place.displayName.text.trim() : null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    googleMapsUri: typeof place.googleMapsUri === 'string' ? place.googleMapsUri : null,
    reviews: Array.isArray(place.reviews)
      ? place.reviews
          .map((r) => ({
            authorName:
              typeof r.authorAttribution?.displayName === 'string'
                ? r.authorAttribution.displayName.trim()
                : 'Χρήστης Google',
            rating: typeof r.rating === 'number' ? r.rating : 0,
            text: typeof r.text?.text === 'string' ? r.text.text.trim() : '',
            relativeTime:
              typeof r.relativePublishTimeDescription === 'string'
                ? r.relativePublishTimeDescription.trim()
                : '',
            profilePhotoUrl:
              typeof r.authorAttribution?.photoUri === 'string' ? r.authorAttribution.photoUri : undefined,
          }))
          .filter((r) => r.text || r.rating > 0)
      : [],
  };

  reviewCache.set(id, { expires: Date.now() + CACHE_TTL_MS, data });
  return data;
}

module.exports = {
  normalizeGooglePlaceId,
  resolveGooglePlaceIdInput,
  extractPlaceIdFromMapsUrl,
  fetchGooglePlaceReviews,
};
