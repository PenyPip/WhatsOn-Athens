'use strict';

const { moreTheaterLinkIsKids } = require('../../../../utils/moreTheaterKids');

function applyKidsFromMoreLink(data) {
  if (!data || typeof data !== 'object') return;
  const link = data.more_link;
  if (typeof link !== 'string' || !link.trim()) return;
  if (moreTheaterLinkIsKids(link)) {
    data.is_kids = true;
  }
}

module.exports = {
  beforeCreate(event) {
    applyKidsFromMoreLink(event.params.data);
  },
  beforeUpdate(event) {
    applyKidsFromMoreLink(event.params.data);
  },
};
