'use strict';

/** Μόνο authenticated Strapi admin (κλήσεις από το panel). */
module.exports = async (policyContext) => Boolean(policyContext.state.admin);
