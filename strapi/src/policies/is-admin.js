'use strict';

/** Μόνο authenticated Strapi admin (κλήσεις από το panel, Bearer JWT). */
module.exports = async (policyContext, _config, { strapi }) => {
  if (policyContext.state.admin) return true;

  const auth = policyContext.request.header.authorization;
  if (!auth?.startsWith('Bearer ')) return false;

  const token = auth.slice(7).trim();
  if (!token) return false;

  try {
    const { payload, isValid } = await strapi.admin.services.token.decodeJwtToken(token);
    if (!isValid || !payload?.id) return false;
    const admin = await strapi.admin.services.user.findOne(payload.id);
    if (!admin) return false;
    policyContext.state.admin = admin;
    return true;
  } catch {
    return false;
  }
};
