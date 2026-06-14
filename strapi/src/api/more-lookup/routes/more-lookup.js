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
      method: 'GET',
      path: '/more-lookup/run/status',
      handler: 'more-lookup.runStatus',
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
      method: 'GET',
      path: '/more-lookup/sync-showtimes/status',
      handler: 'more-lookup.syncShowtimesStatus',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/more-lookup/sync-showtimes/reset',
      handler: 'more-lookup.syncShowtimesReset',
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
    {
      method: 'POST',
      path: '/more-lookup/link',
      handler: 'more-lookup.link',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/more-lookup/create-venue',
      handler: 'more-lookup.createVenue',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
