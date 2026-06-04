'use strict';

/** Χωρίς κλήση στο upload plugin — το CKEditor δεν κολλάει στο admin. */
module.exports = (plugin) => {
  plugin.controllers.config.getUploadConfig = async (ctx) => {
    ctx.send({ responsiveDimensions: false });
  };
  return plugin;
};
