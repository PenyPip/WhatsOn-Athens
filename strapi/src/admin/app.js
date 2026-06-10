import React from 'react';

const config = {
  locales: ['en'],
  translations: {
    en: {
      'venues.section.title': 'Χώροι',
      'venues.cinema.menu': 'Σινεμά',
      'venues.theater.menu': 'Θέατρα',
      'venues.other.menu': 'Άλλοι χώροι',
      'venues.all.menu': 'Όλοι οι χώροι',
      'content-manager.content-types.api::venue.venue.type': 'Τύπος',
      'content-manager.content-types.api::venue.venue.name': 'Όνομα',
      'content-manager.content-types.api::venue.venue.city': 'Πόλη',
      'content-manager.content-types.api::venue.venue.district': 'Περιοχή',
      'content-manager.content-types.api::venue.venue.summer_outdoor': 'Θερινό / Ανοιχτό',
      'content-manager.content-types.api::venue.venue.venue_id': 'More venueId',
      'content-manager.content-types.api::venue.venue.event_group_code': 'Venue bundle (More)',
      'content-manager.content-types.api::venue.venue.more_link': 'More link',
      'content-manager.enum.api::venue.venue.type.cinema': 'Σινεμά',
      'content-manager.enum.api::venue.venue.type.theater': 'Θέατρο',
      'content-manager.enum.api::venue.venue.type.other': 'Άλλο',
      'content-manager.content-types.api::theater-show.theater-show.title': 'Τίτλος',
      'content-manager.content-types.api::theater-performance.theater-performance.datetime': 'Ημερομηνία',
      'content-manager.content-types.api::showtime.showtime.import_source': 'Πηγή εισαγωγής',
      'content-manager.content-types.api::showtime.showtime.import_trace': 'Πηγή εντοπισμού',
      'content-manager.content-types.api::theater-performance.theater-performance.import_source': 'Πηγή εισαγωγής',
      'content-manager.content-types.api::theater-performance.theater-performance.import_trace': 'Πηγή εντοπισμού',
      'content-manager.enum.api::showtime.showtime.import_source.manual': 'Χειροκίνητα (CMS)',
      'content-manager.enum.api::showtime.showtime.import_source.more_sync': 'More sync',
      'content-manager.enum.api::showtime.showtime.import_source.repeat_expand': 'Επανάληψη προβολής',
      'content-manager.enum.api::theater-performance.theater-performance.import_source.manual': 'Χειροκίνητα (CMS)',
      'content-manager.enum.api::theater-performance.theater-performance.import_source.more_sync': 'More sync',
      'content-manager.enum.api::theater-performance.theater-performance.import_source.repeat_expand': 'Επανάληψη προβολής',
    },
  },
};

const register = (app) => {
  app.registerPlugin({
    id: 'cache-clear',
    name: 'Εκκαθάριση cache',
  });

  app.addMenuSection({
    id: 'whatson-venues',
    label: 'Χώροι',
  });

  app.addMenuLink({
    to: '/plugins/venues-cinema',
    section: 'whatson-venues',
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
    position: 1,
  });

  app.addMenuLink({
    to: '/plugins/venues-theater',
    section: 'whatson-venues',
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
    position: 2,
  });

  app.addMenuLink({
    to: '/plugins/venues-other',
    section: 'whatson-venues',
    icon: () => React.createElement('span', null, '📍'),
    intlLabel: {
      id: 'venues.other.menu',
      defaultMessage: 'Άλλοι χώροι',
    },
    Component: async () => {
      const { createVenueListRedirect } = await import('./pages/VenueListRedirect');
      return createVenueListRedirect('other');
    },
    permissions: [],
    position: 3,
  });

  app.addMenuLink({
    to: '/plugins/venues-all',
    section: 'whatson-venues',
    icon: () => React.createElement('span', null, '🏛️'),
    intlLabel: {
      id: 'venues.all.menu',
      defaultMessage: 'Όλοι οι χώροι',
    },
    Component: async () => {
      const { createVenueListRedirect } = await import('./pages/VenueListRedirect');
      return createVenueListRedirect(null);
    },
    permissions: [],
    position: 4,
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
};

export default {
  config,
  register,
};
