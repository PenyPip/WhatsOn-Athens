'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/program-import/status',
      handler: 'program-import.status',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'GET',
      path: '/program-import/cinemas',
      handler: 'program-import.cinemas',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/program-import/preview',
      handler: 'program-import.preview',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/program-import/create',
      handler: 'program-import.create',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
