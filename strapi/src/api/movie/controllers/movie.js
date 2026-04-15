'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const path = require('path');

module.exports = createCoreController('api::movie.movie', ({ strapi }) => ({

  async syncMovieglu(ctx) {
    try {
      const { fullSync } = require(path.join(__dirname, '../../../services/movieglu'));
      const { force = false, limit = 20, withShowtimes = true } = ctx.request.body || {};
      const result = await fullSync(strapi, { force, limit, withShowtimes });
      ctx.body = { success: true, data: result };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { success: false, error: err.message };
    }
  },

  async syncShowtimes(ctx) {
    try {
      const { syncFilmShowtimes } = require(path.join(__dirname, '../../../services/movieglu'));
      const { id } = ctx.params;
      const movie = await strapi.db.query('api::movie.movie').findOne({ where: { id } });
      if (!movie) { ctx.status = 404; ctx.body = { error: 'Movie not found' }; return; }
      if (!movie.movieglu_film_id) { ctx.status = 400; ctx.body = { error: 'No MovieGlu film_id' }; return; }
      const result = await syncFilmShowtimes(strapi, movie.movieglu_film_id, movie.id);
      ctx.body = { success: true, data: result };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { success: false, error: err.message };
    }
  },
}));