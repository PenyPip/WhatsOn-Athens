'use strict';

const CACHE_TTL_MS = 60 * 60 * 1000;
/** @type {Map<string, { expires: number, data: object }>} */
const reviewCache = new Map();
/** @type {Map<string, { expires: number, id: string }>} */
const placeIdResolveCache = new Map();

function coerceChijPlaceId(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  const fromResource = s.match(/^places\/(ChI[a-zA-Z0-9_-]+)$/i);
  if (fromResource?.[1]) return fromResource[1];
  if (/^ChI[a-zA-Z0-9_-]+$/.test(s)) return s;
  const embedded = s.match(/(ChI[a-zA-Z0-9_-]{20,})/);
  return embedded?.[1] ?? null;
}

function extractPlaceIdFromMapsUrl(urlString) {
  const s = typeof urlString === 'string' ? urlString : '';
  if (!s) return null;

  const chij = coerceChijPlaceId(s);
  if (chij) return chij;

  try {
    const u = new URL(s);
    const q = u.searchParams.get('place_id');
    if (q) {
      const fromQ = coerceChijPlaceId(decodeURIComponent(q.replace(/\+/g, ' ')).trim());
      if (fromQ) return fromQ;
    }
  } catch {
    /* όχι απόλυτο URL */
  }

  return null;
}

/** Όνομα + συντεταγμένες από Maps URL (μετά redirect). */
function parseMapsUrlHints(urlString) {
  const s = typeof urlString === 'string' ? urlString : '';
  if (!s) return { name: null, lat: null, lng: null, extractedId: null };

  let name = null;
  const placePath = s.match(/\/maps\/place\/([^/@?]+)/i) || s.match(/\/place\/([^/@?]+)/i);
  if (placePath?.[1]) {
    name = decodeURIComponent(placePath[1].replace(/\+/g, ' ')).trim();
  }

  const coords = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  const lat = coords?.[1] ? Number(coords[1]) : null;
  const lng = coords?.[2] ? Number(coords[2]) : null;

  return {
    name,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    extractedId: extractPlaceIdFromMapsUrl(s),
  };
}

function isMapsShareLink(s) {
  return /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps|google\.com\/maps|maps\.google\.)/i.test(
    s,
  );
}

async function followMapsShareUrl(raw) {
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const res = await fetch(href, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  return res.url;
}

/**
 * Maps share URL → ChIJ… μέσω redirect + Text Search (Places API New).
 * @param {string} raw
 * @param {{ restaurantName?: string }} [context]
 * @returns {Promise<string | null>}
 */
async function resolveGooglePlaceIdInput(raw, context = {}) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;

  const cacheKey = `${s.toLowerCase()}|${(context.restaurantName || '').toLowerCase()}`;
  const cached = placeIdResolveCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.id;

  const direct = coerceChijPlaceId(s);
  if (direct) {
    placeIdResolveCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, id: direct });
    return direct;
  }

  let mapsUrl = s;
  if (isMapsShareLink(s) || s.includes('maps.app') || s.includes('google.com/maps')) {
    try {
      mapsUrl = await followMapsShareUrl(s);
    } catch {
      /* redirect απέτυχε — δοκιμή με το αρχικό κείμενο */
    }
  }

  const hints = parseMapsUrlHints(mapsUrl);
  if (hints.extractedId) {
    placeIdResolveCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, id: hints.extractedId });
    return hints.extractedId;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return null;

  const chij = await searchTextPlaceId(apiKey, hints, context.restaurantName);
  if (chij) {
    placeIdResolveCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, id: chij });
    return chij;
  }

  return null;
}

async function searchTextPlaceId(apiKey, hints, restaurantName) {
  const name =
    (typeof hints.name === 'string' && hints.name.trim()) ||
    (typeof restaurantName === 'string' && restaurantName.trim()) ||
    '';

  const parts = [];
  if (name) parts.push(name);
  if (hints.lat != null && hints.lng != null) {
    parts.push('Ελλάδα');
  } else {
    parts.push('Αθήνα', 'Ελλάδα');
  }

  const textQuery = parts.join(' ').trim();
  if (!textQuery) return null;

  const body = { textQuery, languageCode: 'el' };
  if (hints.lat != null && hints.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: hints.lat, longitude: hints.lng },
        radius: hints.name ? 400 : 120,
      },
    };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.name,places.displayName',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`places:searchText ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const first = Array.isArray(json.places) ? json.places[0] : null;
  return coerceChijPlaceId(first?.id) || coerceChijPlaceId(first?.name);
}

function normalizeGooglePlaceId(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  return coerceChijPlaceId(s) || extractPlaceIdFromMapsUrl(s);
}

/**
 * @param {string} placeIdInput CMS: share URL (maps.app.goo.gl), Maps URL ή ChIJ…
 * @param {{ restaurantName?: string }} [context]
 */
async function fetchGooglePlaceReviews(placeIdInput, context = {}) {
  const empty = {
    reviews: [],
    rating: null,
    userRatingCount: null,
    googleMapsUri: null,
    placeName: null,
  };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return { ...empty, status: 'missing_api_key' };
  }

  let id;
  try {
    id = await resolveGooglePlaceIdInput(placeIdInput, context);
  } catch (e) {
    throw new Error(`resolve place id: ${e.message || e}`);
  }

  if (!id) {
    return { ...empty, status: 'unresolved_place' };
  }

  const cached = reviewCache.get(id);
  if (cached && cached.expires > Date.now()) return { ...cached.data, status: 'ok' };

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=el`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,reviews',
    },
    signal: AbortSignal.timeout(12_000),
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
    status: 'ok',
  };

  reviewCache.set(id, { expires: Date.now() + CACHE_TTL_MS, data });
  return data;
}

module.exports = {
  normalizeGooglePlaceId,
  resolveGooglePlaceIdInput,
  extractPlaceIdFromMapsUrl,
  parseMapsUrlHints,
  fetchGooglePlaceReviews,
  coerceChijPlaceId,
};
