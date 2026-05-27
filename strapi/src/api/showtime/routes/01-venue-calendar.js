'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/showtimes/venue-calendar',
      handler: 'api::showtime.showtime.venueCalendar',
      config: {
        auth: false,
      },
    },
  ],
};
