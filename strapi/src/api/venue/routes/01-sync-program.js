'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/venues/sync-program-status',
      handler: 'venue.syncProgramStatus',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
