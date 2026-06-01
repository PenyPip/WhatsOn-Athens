'use strict';

const CACHE_TTL_MS = 60 * 60 * 1000;
/** @type {Map<string, { expires: number, data: object }>} */
const reviewCache = new Map();

function normalizeGooglePlaceId(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  if (/^ChI[a-zA-Z0-9_-]+$/.test(s)) return s;
  const fromQuery = s.match(/[?&]place_id=([^&]+)/i);
  if (fromQuery?.[1]) return decodeURIComponent(fromQuery[1].replace(/\+/g, ' ')).trim();
  const chij = s.match(/(ChI[a-zA-Z0-9_-]{20,})/);
  if (chij?.[1]) return chij[1];
  return s;
}

/**
 * @param {string} placeId
 * @returns {Promise<{
 *   reviews: Array<{ authorName: string, rating: number, text: string, relativeTime: string, profilePhotoUrl?: string }>,
 *   rating: number | null,
 *   userRatingCount: number | null,
 *   googleMapsUri: string | null,
 *   placeName: string | null,
 * }>}
 */
async function fetchGooglePlaceReviews(placeId) {
  const id = normalizeGooglePlaceId(placeId);
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
  fetchGooglePlaceReviews,
};
