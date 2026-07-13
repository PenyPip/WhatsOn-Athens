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
      method: 'POST',
      path: '/user-profiles/me/seen-movies/:movieId',
      handler: 'api::user-profile.user-profile.toggleSeenMovie',
    },
    {
      method: 'POST',
      path: '/user-profiles/me/seen-theater-shows/:theaterShowId',
      handler: 'api::user-profile.user-profile.toggleSeenTheaterShow',
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
