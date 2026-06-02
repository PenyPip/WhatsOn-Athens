'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/cache/clear',
      handler: 'cache.clear',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
