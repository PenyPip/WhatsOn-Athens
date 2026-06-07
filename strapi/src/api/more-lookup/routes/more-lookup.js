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
      method: 'POST',
      path: '/more-lookup/run',
      handler: 'more-lookup.run',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
