import React from 'react';

const config = {
  locales: ['en'],
};

const bootstrap = () => {};

const register = (app) => {
  app.registerPlugin({
    id: 'more-lookup',
    name: 'More event codes',
  });

  app.registerPlugin({
    id: 'cache-clear',
    name: 'Εκκαθάριση cache',
  });

  app.addMenuLink({
    to: '/plugins/more-lookup',
    icon: () => React.createElement('span', null, '🎟️'),
    intlLabel: {
      id: 'more-lookup.plugin.name',
      defaultMessage: 'More κωδικοί ταινίας',
    },
    Component: () => import('./pages/MoreLookupPage'),
    permissions: [],
    position: 2,
  });

  app.addMenuLink({
    to: '/plugins/cache-clear',
    icon: () => React.createElement('span', null, '🧹'),
    intlLabel: {
      id: 'cache-clear.plugin.name',
      defaultMessage: 'Εκκαθάριση cache',
    },
    Component: () => import('./pages/ClearCachePage'),
    permissions: [],
    position: 3,
  });

  app.addSettingsLink({
    id: 'more-lookup',
    to: '/settings/more-event-codes',
    intlLabel: {
      id: 'more-lookup.settings.name',
      defaultMessage: 'More κωδικοί ταινίας',
    },
    Component: () => import('./pages/MoreLookupPage'),
    permissions: [],
  });
};

export default {
  config,
  bootstrap,
  register,
};
