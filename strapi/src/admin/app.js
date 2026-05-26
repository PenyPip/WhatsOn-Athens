const config = {
  locales: ['el'],
};

const bootstrap = (app) => {
  app.injectContentManagerComponent('listView', 'actions', {
    name: 'sync-program-status',
    Component: async () => import('./extensions/components/SyncProgramStatusButton'),
  });
};

export default {
  config,
  bootstrap,
};
