'use strict';

/** Αν το upload plugin αποτύχει, μην κολλάει το CKEditor στο admin. */
module.exports = (plugin) => {
  const original = plugin.controllers?.config?.getUploadConfig;
  if (typeof original !== 'function') return plugin;

  plugin.controllers.config.getUploadConfig = async (ctx) => {
    try {
      await original(ctx);
    } catch (err) {
      strapi.log.warn(`[ckeditor5] upload config fallback: ${err?.message || err}`);
      ctx.send({ responsiveDimensions: false });
    }
  };

  return plugin;
};
