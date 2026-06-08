'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/theater-performances/home-calendar',
      handler: 'api::theater-performance.theater-performance.homeCalendar',
      config: {
        auth: false,
      },
    },
  ],
};
