'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/restaurants/google-reviews/:slug',
      handler: 'api::restaurant.restaurant.googleReviews',
      config: {
        auth: false,
      },
    },
  ],
};
