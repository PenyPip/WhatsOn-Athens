'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/movies',
      handler: 'movie.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/movies/:id',
      handler: 'movie.findOne',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/movies',
      handler: 'movie.create',
    },
    {
      method: 'PUT',
      path: '/movies/:id',
      handler: 'movie.update',
    },
    {
      method: 'DELETE',
      path: '/movies/:id',
      handler: 'movie.delete',
    },
    {
      method: 'POST',
      path: '/movies/sync-movieglu',
      handler: 'movie.syncMovieglu',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/movies/:id/sync-showtimes',
      handler: 'movie.syncShowtimes',
      config: { auth: false },
    },
  ],
};