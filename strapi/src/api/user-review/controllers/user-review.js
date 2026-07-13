'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

const REVIEW_POPULATE = {
  movie: { fields: ['id', 'slug', 'title', 'original_title'] },
  theater_show: { fields: ['id', 'slug', 'title'] },
  restaurant: { fields: ['id', 'slug', 'name'] },
};

function requireUser(ctx) {
  const user = ctx.state.user;
  if (!user) {
    ctx.unauthorized('Authentication required');
    return null;
  }
  return user;
}

function mapReview(row) {
  if (!row) return null;
  const movie = row.movie;
  const theaterShow = row.theater_show;
  const restaurant = row.restaurant;
  let contentTitle = '';
  if (movie) contentTitle = movie.title || movie.original_title || '';
  else if (theaterShow) contentTitle = theaterShow.title || '';
  else if (restaurant) contentTitle = restaurant.name || '';

  return {
    id: row.id,
    userName: row.user_name,
    rating: Number(row.rating),
    body: row.body,
    contentType: row.content_type,
    contentTitle,
    movieId: movie?.id ?? null,
    theaterShowId: theaterShow?.id ?? null,
    restaurantId: restaurant?.id ?? null,
    createdAt: row.createdAt,
  };
}

module.exports = createCoreController('api::user-review.user-review', ({ strapi }) => ({
  async listMine(ctx) {
    const user = requireUser(ctx);
    if (!user) return;

    const rows = await strapi.db.query('api::user-review.user-review').findMany({
      where: { user: user.id },
      populate: REVIEW_POPULATE,
      orderBy: { createdAt: 'desc' },
    });

    ctx.body = { data: rows.map(mapReview).filter(Boolean) };
  },

  async createMine(ctx) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body || {};
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
    const rating = Number(body.rating);
    const reviewBody = typeof body.body === 'string' ? body.body.trim() : '';
    const movieId = body.movieId != null ? Number(body.movieId) : null;
    const theaterShowId = body.theaterShowId != null ? Number(body.theaterShowId) : null;
    const restaurantId = body.restaurantId != null ? Number(body.restaurantId) : null;

    if (!['movie', 'theater', 'restaurant'].includes(contentType)) {
      return ctx.badRequest('Invalid content type');
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return ctx.badRequest('Rating must be between 1 and 5');
    }

    const data = {
      user: user.id,
      user_name: user.username || user.email || 'Χρήστης',
      user_email: user.email || null,
      content_type: contentType,
      rating,
      body: reviewBody ? reviewBody.slice(0, 4000) : '',
    };

    if (contentType === 'movie') {
      if (!movieId) return ctx.badRequest('movieId required');
      const movie = await strapi.db.query('api::movie.movie').findOne({ where: { id: movieId } });
      if (!movie) return ctx.notFound('Movie not found');
      data.movie = movieId;
    } else if (contentType === 'theater') {
      if (!theaterShowId) return ctx.badRequest('theaterShowId required');
      const show = await strapi.db.query('api::theater-show.theater-show').findOne({ where: { id: theaterShowId } });
      if (!show) return ctx.notFound('Theater show not found');
      data.theater_show = theaterShowId;
    } else if (contentType === 'restaurant') {
      if (!restaurantId) return ctx.badRequest('restaurantId required');
      const restaurant = await strapi.db.query('api::restaurant.restaurant').findOne({ where: { id: restaurantId } });
      if (!restaurant) return ctx.notFound('Restaurant not found');
      data.restaurant = restaurantId;
    }

    const existing = await strapi.db.query('api::user-review.user-review').findOne({
      where: {
        user: user.id,
        content_type: contentType,
        ...(contentType === 'movie' ? { movie: movieId } : {}),
        ...(contentType === 'theater' ? { theater_show: theaterShowId } : {}),
        ...(contentType === 'restaurant' ? { restaurant: restaurantId } : {}),
      },
    });
    if (existing) {
      return ctx.badRequest('You already reviewed this item');
    }

    const created = await strapi.entityService.create('api::user-review.user-review', {
      data,
      populate: REVIEW_POPULATE,
    });

    ctx.body = { data: mapReview(created) };
  },

  async deleteMine(ctx) {
    const user = requireUser(ctx);
    if (!user) return;

    const reviewId = Number(ctx.params.id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) return ctx.badRequest('Invalid review id');

    const existing = await strapi.db.query('api::user-review.user-review').findOne({
      where: { id: reviewId, user: user.id },
    });
    if (!existing) return ctx.notFound('Review not found');

    await strapi.entityService.delete('api::user-review.user-review', reviewId);
    ctx.body = { data: { id: reviewId, deleted: true } };
  },
}));
