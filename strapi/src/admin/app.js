import React from 'react';

const config = {
  locales: ["en"],
};

const bootstrap = () => {};

const register = (app) => {
  app.addMenuLink({
    to: '/plugins/cache-clear',
    icon: () => React.createElement('span', null, '🧹'),
    intlLabel: {
      id: 'cache-clear.plugin.name',
      defaultMessage: 'Εκκαθάριση cache',
    },
    Component: async () => {
      const component = await import('./pages/ClearCachePage');
      return component;
    },
    permissions: [],
  });
  app.addMenuLink({
    to: '/plugins/more-lookup',
    icon: () => React.createElement('span', null, '🎟️'),
    intlLabel: {
      id: 'more-lookup.plugin.name',
      defaultMessage: 'More event codes',
    },
    Component: async () => {
      const component = await import('./pages/MoreLookupPage');
      return component;
    },
    permissions: [],
  });
};

export default {
  config,
  bootstrap,
  register,
};
