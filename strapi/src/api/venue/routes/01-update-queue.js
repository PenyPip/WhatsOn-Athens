'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/venues/update-queues',
      handler: 'venue.updateQueues',
      config: {
        // Όπως more-lookup: χωρίς Users&Permissions auth — αλλιώς 401 → logout από admin.
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/venues/sync-athinorama-pending',
      handler: 'venue.syncAthinoramaPending',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
