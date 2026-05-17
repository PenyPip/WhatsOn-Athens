'use strict';

const PUBLIC_ACTION = 'api::homepage.homepage.find';

module.exports = {
  /**
   * @param {{ strapi: import('@strapi/strapi').Strapi }} opts
   */
  async bootstrap({ strapi }) {
    try {
      const publicRole = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' } });

      if (!publicRole) return;

      const perms = await strapi.db.query('plugin::users-permissions.permission').findMany({
        where: { role: publicRole.id, action: PUBLIC_ACTION },
        limit: 1,
      });

      const permission = perms[0];
      if (!permission) {
        strapi.log.warn(
          '[whatson] Στο Users & Permissions → Public → Homepage: κάνε tick το find (είδος single type). Το πρώτο boot με νέο content type συχνά το δημιουργεί αυτόματα μετά από restart.',
        );
        return;
      }

      if (!permission.enabled) {
        await strapi.db.query('plugin::users-permissions.permission').update({
          where: { id: permission.id },
          data: { enabled: true },
        });
      }
    } catch (e) {
      strapi.log.warn('[bootstrap homepage permission]', e);
    }
  },
};
