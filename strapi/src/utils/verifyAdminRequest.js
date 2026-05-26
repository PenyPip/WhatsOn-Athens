'use strict';

/** Έλεγχος Bearer JWT admin (κλήσεις από το Strapi panel). */
async function verifyAdminRequest(ctx, strapi) {
  if (ctx.state.admin) return ctx.state.admin;

  const auth = ctx.request.header.authorization;
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7).trim();
  if (!token) return null;

  try {
    const { payload, isValid } = await strapi.admin.services.token.decodeJwtToken(token);
    if (!isValid || !payload?.id) return null;
    const admin = await strapi.admin.services.user.findOne(payload.id);
    if (!admin) return null;
    ctx.state.admin = admin;
    return admin;
  } catch {
    return null;
  }
}

module.exports = { verifyAdminRequest };
