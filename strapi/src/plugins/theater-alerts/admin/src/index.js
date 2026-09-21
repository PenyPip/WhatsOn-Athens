import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import PluginIcon from './components/PluginIcon';

const name = pluginPkg.strapi.displayName;

export default {
  register(app) {
    app.registerPlugin({
      id: pluginId,
      name,
    });

    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: name,
      },
      Component: () => import('./pages/App'),
      permissions: [],
    });
  },
};
