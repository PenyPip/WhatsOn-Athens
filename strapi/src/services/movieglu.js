'use strict';

const MOVIEGLU_CONFIG = {
  baseUrl: 'https://api-gate2.movieglu.com',
  client: process.env.MOVIEGLU_CLIENT || 'WHAT_4',
  apiKey: process.env.MOVIEGLU_API_KEY || 'V16J9QEter81AEppVqaZE3kKpKNn4XNNaHKcxfUi',
  authorization: process.env.MOVIEGLU_AUTH || 'Basic V0hBVF80X1hYOmZpQXUxY00zM1p0Tg==',
  territory: process.env.MOVIEGLU_TERRITORY || 'XX',
  geolocation: process.env.MOVIEGLU_GEOLOCATION || '22.0;14.0',
};

const GENRE_MAP = {
  'Action': 'action', 'Adventure': 'adventure', 'Animation': 'animation',
  'Comedy': 'comedy', 'Crime': 'thriller', 'Documentary': 'documentary',
  'Drama': 'drama', 'Fantasy': 'fantasy', 'Horror': 'horror',
  'Musical': 'musical', 'Mystery': 'thriller', 'Romance': 'romance',
  'Sci-Fi': 'sci-fi', 'Science Fiction': 'sci-fi', 'Thriller': 'thriller',
  'War': 'drama', 'Western': 'other',
};

const GENRE_GRADIENTS = {
  action:      { from: '#f12711', to: '#f5af19' },
  adventure:   { from: '#11998e', to: '#38ef7d' },
  animation:   { from: '#fc5c7d', to: '#6a82fb' },
  comedy:      { from: '#2193b0', to: '#6dd5ed' },
  documentary: { from: '#373B44', to: '#4286f4' },
  drama:       { from: '#2c3e50', to: '#4ca1af' },
  fantasy:     { from: '#834d9b', to: '#d04ed6' },
  horror:      { from: '#0f0c29', to: '#302b63' },
  musical:     { from: '#fc5c7d', to: '#6a82fb' },
  romance:     { from: '#e55d87', to: '#5fc3e4' },
  'sci-fi':    { from: '#f5af19', to: '#f12711' },
  thriller:    { from: '#bdc3c7', to: '#2c3e50' },
  other:       { from: '#1a1a2e', to: '#e94560' },
};

function getDeviceDatetime() {
  return new Date().toISOString().replace(/(\.\d{3})Z$/, '.000Z');
}

function toSlug(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .replace(/^-|-$/g, '');
}

async function moviegluFetch(endpoint, params = {}) {
  const url = new URL(`${MOVIEGLU_CONFIG.baseUrl}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const headers = {
    'client': MOVIEGLU_CONFIG.client,
    'x-api-key': MOVIEGLU_CONFIG.apiKey,
    'authorization': MOVIEGLU_CONFIG.authorization,
    'territory': MOVIEGLU_CONFIG.territory,
    'api-version': 'v201',
    'geolocation': MOVIEGLU_CONFIG.geolocation,
    'device-datetime': getDeviceDatetime(),
  };

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MovieGlu ${endpoint} ${res.status}: ${text.substring(0, 200)}`);
  }

  return res.json();
}

async function syncCinemas(strapi) {
  strapi.log.info('🏛️  Syncing cinemas → Venues...');

  const data = await moviegluFetch('/cinemasNearby/', { n: 30 });
  const cinemas = data.cinemas || [];
  strapi.log.info(`📡 ${cinemas.length} cinemas from MovieGlu`);

  let created = 0, updated = 0;

  for (const cinema of cinemas) {
    const slug = toSlug(cinema.cinema_name);

    const existing = await strapi.db.query('api::venue.venue').findOne({
      where: { movieglu_cinema_id: cinema.cinema_id },
    }).catch(() => null);

    const bySlug = !existing
      ? await strapi.db.query('api::venue.venue').findOne({ where: { slug } }).catch(() => null)
      : null;

    const venueData = {
      movieglu_cinema_id: cinema.cinema_id,
      name: cinema.cinema_name,
      slug: existing?.slug || bySlug?.slug || slug,
      address: [cinema.address1, cinema.address2, cinema.address3].filter(Boolean).join(', ') || null,
      city: 'athens',
      google_maps_url: cinema.lat && cinema.lng
        ? `https://maps.google.com/?q=${cinema.lat},${cinema.lng}` : null,
      seats_total: null,
      type: 'Σινεμά',
      publishedAt: new Date(),
    };

    if (existing) {
      await strapi.db.query('api::venue.venue').update({ where: { id: existing.id }, data: venueData });
      updated++;
    } else if (bySlug) {
      await strapi.db.query('api::venue.venue').update({ where: { id: bySlug.id }, data: { movieglu_cinema_id: cinema.cinema_id } });
      updated++;
    } else {
      await strapi.db.query('api::venue.venue').create({ data: venueData });
      created++;
    }
  }

  strapi.log.info(`✅ Cinemas: ${created} created, ${updated} updated`);
  return { total: cinemas.length, created, updated };
}

function mapFilmToMovie(film) {
  const genreRaw = (film.genres || [])[0] || 'other';
  const genre = GENRE_MAP[genreRaw] || 'other';
  const grad = GENRE_GRADIENTS[genre] || GENRE_GRADIENTS.other;

  return {
    movieglu_film_id: film.film_id,
    title: film.film_name,
    slug: toSlug(film.film_name),
    synopsis: film.synopsis_long || film.synopsis_short || '',
    director: (film.directors || [])[0]?.director_name || null,
    cast: (film.cast || []).slice(0, 5).map(c => c.cast_name),
    genre,
    duration: film.running_time ? parseInt(film.running_time) : null,
    language: 'Αγγλικά',
    age_rating: Array.isArray(film.age_rating) 
  ? film.age_rating[0]?.rating?.trim() || null 
  : film.age_rating || null,
    critic_score: null,
    release_date: film.release_dates?.GR || film.release_dates?.GB || null,
    trailer_url: film.film_trailer || null,
    poster_url: film.images?.poster?.['1']?.medium?.film_image
      || film.images?.poster?.['2']?.medium?.film_image || null,
    gradient_from: grad.from,
    gradient_to: grad.to,
    publishedAt: new Date(),
  };
}

async function syncNowShowing(strapi, options = {}) {
  const { limit = 20, force = false } = options;

  strapi.log.info('🎬 Syncing films now showing...');
  const data = await moviegluFetch('/filmsNowShowing/', { n: limit });
  const films = data.films || [];
  strapi.log.info(`📡 ${films.length} films from MovieGlu`);

  let created = 0, updated = 0, skipped = 0;
  const syncedMovies = [];

  for (const film of films) {
    try {
      const movieData = mapFilmToMovie(film);

      const byMgId = await strapi.db.query('api::movie.movie').findOne({
        where: { movieglu_film_id: film.film_id },
      }).catch(() => null);

      let movie;

      if (byMgId) {
        if (force) {
          movie = await strapi.db.query('api::movie.movie').update({ where: { id: byMgId.id }, data: movieData });
          updated++;
        } else {
          movie = byMgId;
          skipped++;
        }
      } else {
        const bySlug = await strapi.db.query('api::movie.movie').findOne({
          where: { slug: movieData.slug },
        }).catch(() => null);

        if (bySlug) {
          await strapi.db.query('api::movie.movie').update({ where: { id: bySlug.id }, data: { movieglu_film_id: film.film_id } });
          movie = bySlug;
          skipped++;
        } else {
          movie = await strapi.db.query('api::movie.movie').create({ data: movieData });
          created++;
        }
      }

      syncedMovies.push({ movie, film });
    } catch (err) {
      strapi.log.warn(`⚠️  Film "${film.film_name}": ${err.message}`);
    }
  }

  strapi.log.info(`✅ Films: ${created} created, ${updated} updated, ${skipped} skipped`);
  return { total: films.length, created, updated, skipped, movies: syncedMovies };
}

async function syncFilmShowtimes(strapi, moviegluFilmId, strapiMovieId) {
  let totalCreated = 0;

  for (let day = 0; day < 7; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    try {
      const data = await moviegluFetch('/filmShowTimes/', {
        film_id: moviegluFilmId,
        date: dateStr,
      });

      for (const cinema of (data.cinemas || [])) {
        let venue = await strapi.db.query('api::venue.venue').findOne({
          where: { movieglu_cinema_id: cinema.cinema_id },
        }).catch(() => null);

        if (!venue) {
          const slug = toSlug(cinema.cinema_name);
          venue = await strapi.db.query('api::venue.venue').findOne({ where: { slug } }).catch(() => null);
          if (!venue) {
            venue = await strapi.db.query('api::venue.venue').create({
              data: {
                movieglu_cinema_id: cinema.cinema_id,
                name: cinema.cinema_name,
                slug,
                address: cinema.address1 || null,
                city: 'athens',
                type: 'Σινεμά',
                publishedAt: new Date(),
              },
            });
          }
        }

        const showings = cinema.showings || {};
        const allShowings = [
          ...(showings.Standard || []),
          ...(showings['3D'] || []),
          ...(showings.IMAX || []),
          ...(showings['4DX'] || []),
        ];

        for (const showing of allShowings) {
          for (const time of (showing.times || [])) {
            try {
              const datetime = new Date(`${dateStr}T${time.start_time}:00`);
              if (isNaN(datetime.getTime())) continue;

              const existing = await strapi.db.query('api::showtime.showtime').findOne({
                where: { datetime: datetime.toISOString(), movie: strapiMovieId, venue: venue.id },
              }).catch(() => null);

              if (!existing) {
                await strapi.db.query('api::showtime.showtime').create({
                  data: {
                    datetime: datetime.toISOString(),
                    available_seats: 100,
                    price: showing.film_type === 'IMAX' ? 14 : showing.film_type === '3D' ? 11 : 9,
                    movie: strapiMovieId,
                    venue: venue.id,
                    publishedAt: new Date(),
                  },
                });
                totalCreated++;
              }
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      strapi.log.warn(`⚠️  Showtimes ${dateStr}: ${err.message}`);
    }
  }

  strapi.log.info(`✅ Showtimes: ${totalCreated} created for film ${moviegluFilmId}`);
  return { created: totalCreated };
}

async function fullSync(strapi, options = {}) {
  const { limit = 20, force = false, withShowtimes = true } = options;
  const results = { cinemas: null, movies: null, showtimes: 0, errors: [] };

  try {
    results.cinemas = await syncCinemas(strapi);
  } catch (err) {
    results.errors.push(`Cinemas: ${err.message}`);
    strapi.log.warn('⚠️  Cinema sync failed:', err.message);
  }

  try {
    results.movies = await syncNowShowing(strapi, { limit, force });
  } catch (err) {
    results.errors.push(`Movies: ${err.message}`);
    strapi.log.error('❌ Film sync failed:', err.message);
    throw err;
  }

  if (withShowtimes && results.movies?.movies?.length) {
    strapi.log.info(`🕐 Syncing showtimes for ${results.movies.movies.length} films...`);
    for (const { movie, film } of results.movies.movies) {
      if (!film?.film_id || !movie?.id) continue;
      try {
        const st = await syncFilmShowtimes(strapi, film.film_id, movie.id);
        results.showtimes += st.created;
      } catch (err) {
        strapi.log.warn(`⚠️  Showtimes "${film.film_name}": ${err.message}`);
      }
    }
  }

  strapi.log.info(`🎉 Full sync done | showtimes: ${results.showtimes}`);
  return results;
}

module.exports = { syncNowShowing, syncCinemas, syncFilmShowtimes, fullSync };