import { Refresh } from '@strapi/icons';

const config = {};

const bootstrap = (app) => {
  // ΜΗΝ injectContentManagerComponent — σπάει το Content Manager (λευκή οθόνη).
  app.addMenuLink({
    to: '/plugins/sync-program',
    icon: Refresh,
    intlLabel: {
      id: 'whatson.sync-program.menu',
      defaultMessage: 'Έλεγχος προγράμματος',
    },
    Component: () => import('./pages/SyncProgramPage'),
  });
};

export default {
  config,
  bootstrap,
};
