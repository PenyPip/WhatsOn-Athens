'use strict';

const CACHE_TTL_MS = 60 * 60 * 1000;
/** @type {Map<string, { expires: number, data: object }>} */
const reviewCache = new Map();
/** @type {Map<string, { expires: number, id: string }>} */
const placeIdResolveCache = new Map();

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

  const extractedId = extractPlaceIdFromMapsUrl(s);

  return { name, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null, extractedId };
}

function isChijPlaceId(id) {
  return typeof id === 'string' && /^ChI[a-zA-Z0-9_-]+$/.test(id);
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
 * Maps share URL / 0x…:0x… → ChIJ… μέσω Text Search (Places API New).
 * @param {string} raw
 * @returns {Promise<string | null>}
 */
async function resolveGooglePlaceIdInput(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;

  const cacheKey = s.toLowerCase();
  const cached = placeIdResolveCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.id;

  if (isChijPlaceId(s)) {
    placeIdResolveCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, id: s });
    return s;
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
  if (hints.extractedId && isChijPlaceId(hints.extractedId)) {
    placeIdResolveCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, id: hints.extractedId });
    return hints.extractedId;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return null;

  const chij = await searchTextPlaceId(apiKey, hints);
  if (chij) {
    placeIdResolveCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, id: chij });
    return chij;
  }

  if (hints.extractedId && isChijPlaceId(hints.extractedId)) {
    return hints.extractedId;
  }

  return null;
}

async function searchTextPlaceId(apiKey, hints) {
  const parts = [];
  if (hints.name) parts.push(hints.name);
  parts.push('Αθήνα', 'Ελλάδα');
  const textQuery = parts.join(' ').trim();
  if (!textQuery) return null;

  const body = { textQuery, languageCode: 'el' };
  if (hints.lat != null && hints.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: hints.lat, longitude: hints.lng },
        radius: 250,
      },
    };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName',
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
  const id = typeof first?.id === 'string' ? first.id.trim() : '';
  return isChijPlaceId(id) ? id : null;
}

function normalizeGooglePlaceId(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  if (isChijPlaceId(s)) return s;
  return extractPlaceIdFromMapsUrl(s);
}

/**
 * @param {string} placeIdInput CMS: ChIJ…, goo.gl ή πλήρες Maps URL
 */
async function fetchGooglePlaceReviews(placeIdInput) {
  const empty = {
    reviews: [],
    rating: null,
    userRatingCount: null,
    googleMapsUri: null,
    placeName: null,
  };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return empty;

  let id;
  try {
    id = await resolveGooglePlaceIdInput(placeIdInput);
  } catch (e) {
    throw new Error(`resolve place id: ${e.message || e}`);
  }
  if (!id || !isChijPlaceId(id)) return empty;

  const cached = reviewCache.get(id);
  if (cached && cached.expires > Date.now()) return cached.data;

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
};
