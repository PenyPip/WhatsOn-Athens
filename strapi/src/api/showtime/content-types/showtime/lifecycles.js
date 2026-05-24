'use strict';

const { expandRepeatShowtimes } = require('../../services/showtime-repeat');

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
    /* repeat_until αδειάζει μετά την επέκταση — μην το σβήνουμε πριν το δει το afterUpdate */
  }
}

function lifecycleShowtimeId(event) {
  return event?.result?.id ?? event?.params?.where?.id ?? null;
}

function lifecycleRepeatUntil(event) {
  const v = event?.params?.data?.repeat_until;
  return v === undefined ? null : v;
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
    });
    if (existing) {
      if (data.schedule_kind === undefined) data.schedule_kind = existing.schedule_kind;
      if (data.week_end === undefined) data.week_end = existing.week_end;
    }
    applyScheduleRules(data);
  },

  async afterCreate(event) {
    const id = lifecycleShowtimeId(event);
    if (!id) return;
    await expandRepeatShowtimes(strapi, id, 'afterCreate', {
      overrideUntil: lifecycleRepeatUntil(event),
    });
  },

  async afterUpdate(event) {
    const id = lifecycleShowtimeId(event);
    if (!id) return;
    await expandRepeatShowtimes(strapi, id, 'afterUpdate', {
      overrideUntil: lifecycleRepeatUntil(event),
    });
  },
};
