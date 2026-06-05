'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/showtimes/home-calendar',
      handler: 'api::showtime.showtime.homeCalendar',
      config: {
        auth: false,
      },
    },
  ],
};
