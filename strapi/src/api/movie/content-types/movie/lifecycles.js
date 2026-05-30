'use strict';

const { errors } = require('@strapi/utils');

function normalizeOriginalTitle(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

function applyOriginalTitleNormalization(data) {
  if (!data || typeof data !== 'object') return;
  if (data.original_title !== undefined) {
    data.original_title = normalizeOriginalTitle(data.original_title);
  }
}

async function assertUniqueOriginalTitle(strapi, originalTitle, excludeId) {
  const normalized = normalizeOriginalTitle(originalTitle);
  if (!normalized) {
    throw new errors.ValidationError(
      'Το original_title είναι υποχρεωτικό και ταυτοποιεί μοναδικά κάθε ταινία.',
    );
  }

  const knex = strapi.db.connection;
  let query = knex('movies').whereRaw('LOWER(TRIM(original_title)) = LOWER(?)', [normalized]);
  if (excludeId != null) {
    query = query.whereNot('id', excludeId);
  }
  const existing = await query.first();
  if (existing) {
    throw new errors.ValidationError(`Υπάρχει ήδη ταινία με original_title «${normalized}».`);
  }
}

module.exports = {
  async beforeCreate(event) {
    applyOriginalTitleNormalization(event.params.data);
    await assertUniqueOriginalTitle(strapi, event.params.data?.original_title);
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    if (!data || data.original_title === undefined) return;
    applyOriginalTitleNormalization(data);
    const excludeId = event.params.where?.id ?? null;
    await assertUniqueOriginalTitle(strapi, data.original_title, excludeId);
  },
};
