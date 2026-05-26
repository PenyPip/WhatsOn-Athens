'use strict';

const { expandRepeatShowtimes } = require('../../services/showtime-repeat');
const { isRepeatChildCreate } = require('../../services/repeat-context');
const {
  scheduleVenueProgramSync,
  scheduleVenueProgramSyncFromShowtime,
} = require('../../../venue/services/program-status');

function normalizeScheduleKind(raw) {
  return raw === 'week_block' ? 'week_block' : 'exact';
}

function applyScheduleRules(data) {
  if (!data || typeof data !== 'object') return;
  const kind = normalizeScheduleKind(data.schedule_kind);
  data.schedule_kind = kind;
  if (kind === 'week_block') {
    if (data.repeat_until && !data.week_end) {
      data.week_end = data.repeat_until;
    }
    data.repeat_skip_days = [];
    if (!data.week_end) {
      throw new Error('Για «Ολόκληρη εβδομάδα» συμπλήρωσε «Τέλος εβδομάδας» (week_end) ή «Repeat until».');
    }
  }
}

function lifecycleShowtimeId(event) {
  return event?.result?.id ?? event?.params?.where?.id ?? null;
}

function lifecycleRepeatUntil(event) {
  const v = event?.params?.data?.repeat_until;
  return v === undefined ? null : v;
}

/** Επέκταση repeat + needs_update στο background — το Save επιστρέφει αμέσως. */
function deferShowtimeSideEffects(strapi, showtimeId, trigger, overrideUntil) {
  setImmediate(() => {
    expandRepeatShowtimes(strapi, showtimeId, trigger, { overrideUntil })
      .then(() => scheduleVenueProgramSyncFromShowtime(strapi, showtimeId))
      .catch((err) => {
        strapi.log.warn(`[showtime] deferred ${trigger} id=${showtimeId}:`, err?.message || err);
      });
  });
}

module.exports = {
  beforeCreate(event) {
    applyScheduleRules(event.params.data);
  },

  async beforeUpdate(event) {
    const data = event.params.data;
    if (!data) return;
    const existing = await strapi.db.query('api::showtime.showtime').findOne({
      where: event.params.where,
      select: ['schedule_kind', 'week_end'],
    });
    if (existing) {
      if (data.schedule_kind === undefined) data.schedule_kind = existing.schedule_kind;
      if (data.week_end === undefined) data.week_end = existing.week_end;
    }
    applyScheduleRules(data);
  },

  async beforeDelete(event) {
    const id = lifecycleShowtimeId(event);
    if (!id) return;
    const existing = await strapi.entityService.findOne('api::showtime.showtime', id, {
      populate: { venue: { fields: ['id'] } },
      publicationState: 'preview',
    });
    event.state = event.state || {};
    event.state.venueIdForProgram = existing?.venue?.id ?? null;
  },

  async afterCreate(event) {
    if (isRepeatChildCreate()) return;
    const id = lifecycleShowtimeId(event);
    if (!id) return;
    deferShowtimeSideEffects(strapi, id, 'afterCreate', lifecycleRepeatUntil(event));
  },

  async afterUpdate(event) {
    if (isRepeatChildCreate()) return;
    const id = lifecycleShowtimeId(event);
    if (!id) return;
    deferShowtimeSideEffects(strapi, id, 'afterUpdate', lifecycleRepeatUntil(event));
  },

  async afterDelete(event) {
    const venueId = event.state?.venueIdForProgram;
    if (!venueId) return;
    scheduleVenueProgramSync(strapi, venueId);
  },
};
