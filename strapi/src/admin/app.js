import React from 'react';

const config = {};

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
};

export default {
  config,
  bootstrap,
  register,
};
