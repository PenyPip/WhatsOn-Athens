'use strict';

const {
  findAllCinemas,
  getProgramImportStatus,
  previewProgramTextImport,
  createProgramTextShowtimes,
} = require('../../../utils/programTextImport');

module.exports = {
  async status(ctx) {
    ctx.body = { ok: true, ...getProgramImportStatus() };
  },

  async cinemas(ctx) {
    const rows = await findAllCinemas(strapi);
    ctx.body = { ok: true, cinemas: rows };
  },

  async preview(ctx) {
    const body = ctx.request.body ?? {};
    const result = await previewProgramTextImport(strapi, {
      text: body.text,
      images: body.images,
      venueId: body.venueId,
      refYear: body.refYear != null ? Number(body.refYear) : undefined,
      summerScreening: body.summerScreening === true,
    });
    if (!result.ok) {
      ctx.status = 400;
    }
    ctx.body = result;
  },

  async create(ctx) {
    const body = ctx.request.body ?? {};
    const result = await createProgramTextShowtimes(strapi, {
      venueId: body.venueId,
      items: body.items,
      importMeta: body.importMeta,
    });
    if (!result.ok) {
      ctx.status = 400;
    }
    ctx.body = result;
  },
};
