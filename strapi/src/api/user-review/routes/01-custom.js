'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-reviews/me',
      handler: 'api::user-review.user-review.listMine',
    },
    {
      method: 'POST',
      path: '/user-reviews/me',
      handler: 'api::user-review.user-review.createMine',
    },
    {
      method: 'DELETE',
      path: '/user-reviews/me/:id',
      handler: 'api::user-review.user-review.deleteMine',
    },
  ],
};
