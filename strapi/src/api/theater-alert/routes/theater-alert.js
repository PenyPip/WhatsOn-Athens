'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/theater-alerts/status',
      handler: 'theater-alert.status',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/theater-alerts/test',
      handler: 'theater-alert.test',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'POST',
      path: '/theater-alerts/process-recent',
      handler: 'theater-alert.processRecent',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'GET',
      path: '/theater-alerts/preview-user',
      handler: 'theater-alert.previewForUser',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
