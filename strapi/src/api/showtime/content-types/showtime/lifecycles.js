'use strict';

const { expandRepeatShowtimes } = require('../../services/showtime-repeat');

module.exports = {
  async afterCreate(event) {
    await expandRepeatShowtimes(strapi, event.result.id, 'afterCreate');
  },

  async afterUpdate(event) {
    await expandRepeatShowtimes(strapi, event.result.id, 'afterUpdate');
  },
};
