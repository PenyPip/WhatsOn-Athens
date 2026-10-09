'use strict';

const { deferNotifyPerformance } = require('../../../../utils/theaterShowNotifications');

function lifecyclePerformanceId(event) {
  return event?.result?.id ?? event?.params?.where?.id ?? null;
}

/**
 * Νέα παράσταση: έλεγχος like και αγαπημένου θεάτρου αμέσως.
 * Όχι cron. Οι επεκτάσεις repeat_expand δεν στέλνουν mail.
 */
function shouldNotifyImportSource(data) {
  const src = data?.import_source;
  return src !== 'repeat_expand';
}

module.exports = {
  async afterCreate(event) {
    const id = lifecyclePerformanceId(event);
    if (!id) return;
    const importSource = event?.result?.import_source ?? event?.params?.data?.import_source;
    if (!shouldNotifyImportSource({ import_source: importSource })) return;
    deferNotifyPerformance(strapi, id);
  },
};
