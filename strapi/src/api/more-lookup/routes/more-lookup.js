'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/more-lookup/status',
      handler: 'more-lookup.status',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'GET',
      path: '/more-lookup/pending',
      handler: 'more-lookup.pending',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/more-lookup/approve',
      handler: 'more-lookup.approve',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/more-lookup/reject',
      handler: 'more-lookup.reject',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/more-lookup/run',
      handler: 'more-lookup.run',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/more-lookup/sync-showtimes',
      handler: 'more-lookup.syncShowtimes',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
