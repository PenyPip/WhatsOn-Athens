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
    {
      method: 'POST',
      path: '/venues/sync-athinorama-pending',
      handler: 'venue.syncAthinoramaPending',
      config: {
        policies: ['global::is-admin'],
      },
    },
  ],
};
