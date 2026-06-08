import React from 'react';

const config = {
  locales: ['en'],
  translations: {
    en: {
      'content-manager.content-types.api::venue.venue.type': 'Τύπος',
      'content-manager.content-types.api::venue.venue.name': 'Όνομα',
      'content-manager.content-types.api::venue.venue.city': 'Πόλη',
      'content-manager.content-types.api::venue.venue.district': 'Περιοχή',
      'content-manager.content-types.api::venue.venue.summer_outdoor': 'Θερινό / Ανοιχτό',
      'content-manager.content-types.api::theater-show.theater-show.title': 'Τίτλος',
      'content-manager.content-types.api::theater-performance.theater-performance.datetime': 'Ημερομηνία',
    },
  },
};

const bootstrap = () => {};

const register = (app) => {
  app.registerPlugin({
    id: 'cache-clear',
    name: 'Εκκαθάριση cache',
  });

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
    to: '/plugins/venues-cinema',
    icon: () => React.createElement('span', null, '🎬'),
    intlLabel: {
      id: 'venues.cinema.menu',
      defaultMessage: 'Σινεμά',
    },
    Component: async () => {
      const { createVenueListRedirect } = await import('./pages/VenueListRedirect');
      return createVenueListRedirect('cinema');
    },
    permissions: [],
    position: 3,
  });

  app.addMenuLink({
    to: '/plugins/venues-theater',
    icon: () => React.createElement('span', null, '🎭'),
    intlLabel: {
      id: 'venues.theater.menu',
      defaultMessage: 'Θέατρα',
    },
    Component: async () => {
      const { createVenueListRedirect } = await import('./pages/VenueListRedirect');
      return createVenueListRedirect('theater');
    },
    permissions: [],
    position: 4,
  });
};

export default {
  config,
  bootstrap,
  register,
};
