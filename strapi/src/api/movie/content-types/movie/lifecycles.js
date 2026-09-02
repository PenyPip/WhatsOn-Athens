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
    if (event.params.data?.most_talked_about === true) {
      event.params.data.most_talked_about_at = new Date().toISOString();
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

    if (data?.most_talked_about !== undefined) {
      const id = where?.id;
      if (id != null) {
        const existing = await strapi.db.query('api::movie.movie').findOne({
          where: { id },
          select: ['most_talked_about'],
        });
        if (data.most_talked_about === true && !existing?.most_talked_about) {
          data.most_talked_about_at = new Date().toISOString();
        } else if (data.most_talked_about === false) {
          data.most_talked_about_at = null;
        }
      }
    }

    if (!data || data.original_title === undefined) return;
    applyOriginalTitleNormalization(data);
    const excludeId = where?.id ?? null;
    await assertUniqueOriginalTitle(strapi, data.original_title, excludeId);
  },
};
