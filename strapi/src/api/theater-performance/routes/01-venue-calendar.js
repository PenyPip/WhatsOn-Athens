'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/theater-performances/venue-calendar',
      handler: 'api::theater-performance.theater-performance.venueCalendar',
      config: {
        auth: false,
      },
    },
  ],
};
