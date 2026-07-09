'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/venues/update-queues',
      handler: 'venue.updateQueues',
      config: {
        policies: ['global::is-admin'],
      },
    },
  ],
};
