'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-profiles/me',
      handler: 'api::user-profile.user-profile.me',
    },
    {
      method: 'PUT',
      path: '/user-profiles/me',
      handler: 'api::user-profile.user-profile.updateMe',
    },
    {
      method: 'POST',
      path: '/user-profiles/me/favorite-movies/:movieId',
      handler: 'api::user-profile.user-profile.toggleFavoriteMovie',
    },
    {
      method: 'POST',
      path: '/user-profiles/me/favorite-venues/:venueId',
      handler: 'api::user-profile.user-profile.toggleFavoriteVenue',
    },
    {
      method: 'GET',
      path: '/user-profiles/popularity/movie/:movieId',
      handler: 'api::user-profile.user-profile.moviePopularity',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/user-profiles/popularity/venue/:venueId',
      handler: 'api::user-profile.user-profile.venuePopularity',
      config: { auth: false },
    },
  ],
};
