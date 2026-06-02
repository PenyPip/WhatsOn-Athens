'use strict';

module.exports = {
  async clear(ctx) {
    let webhookTriggered = false;
    let webhookStatus = null;

    const webhookUrl = process.env.CACHE_PURGE_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.CACHE_PURGE_WEBHOOK_TOKEN
              ? { authorization: `Bearer ${process.env.CACHE_PURGE_WEBHOOK_TOKEN}` }
              : {}),
          },
          body: JSON.stringify({
            source: 'strapi-admin',
            at: new Date().toISOString(),
          }),
        });
        webhookTriggered = true;
        webhookStatus = response.status;
      } catch (err) {
        strapi.log.warn(`[cache.clear] purge webhook failed: ${err?.message || err}`);
      }
    }

    strapi.log.info(
      `[cache.clear] requested by admin ${ctx.state?.admin?.email || 'unknown'}; webhook=${webhookTriggered ? webhookStatus : 'skipped'}`,
    );

    ctx.body = {
      ok: true,
      message: webhookTriggered
        ? `Η εκκαθάριση cache ζητήθηκε. Webhook status: ${webhookStatus}.`
        : 'Η εκκαθάριση cache ολοκληρώθηκε (χωρίς εξωτερικό webhook).',
      webhookTriggered,
      webhookStatus,
    };
  },
};
