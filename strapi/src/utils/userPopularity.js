'use strict';

const MIN_PLATFORM_USERS = 10;
const MIN_INTERESTED_USERS = 10;

async function countPlatformUsers(strapi) {
  return strapi.db.query('plugin::users-permissions.user').count({
    where: { blocked: false },
  });
}

async function countDistinctInterestedUsers(strapi, { movieId, venueId }) {
  const userIds = new Set();

  if (movieId) {
    const profiles = await strapi.db.query('api::user-profile.user-profile').findMany({
      where: { favorite_movies: { id: movieId } },
      populate: ['user'],
    });
    for (const profile of profiles) {
      if (profile.user?.id) userIds.add(profile.user.id);
    }

    const reviews = await strapi.db.query('api::user-review.user-review').findMany({
      where: { movie: movieId },
      populate: ['user'],
    });
    for (const review of reviews) {
      if (review.user?.id) userIds.add(review.user.id);
    }
  }

  if (venueId) {
    const profiles = await strapi.db.query('api::user-profile.user-profile').findMany({
      where: { favorite_venues: { id: venueId } },
      populate: ['user'],
    });
    for (const profile of profiles) {
      if (profile.user?.id) userIds.add(profile.user.id);
    }
  }

  return userIds.size;
}

async function getPopularity(strapi, { movieId, venueId }) {
  const platformUsers = await countPlatformUsers(strapi);
  const interestedCount = await countDistinctInterestedUsers(strapi, { movieId, venueId });
  const platformReady = platformUsers >= MIN_PLATFORM_USERS;
  const isPopular = platformReady && interestedCount >= MIN_INTERESTED_USERS;

  let avgRating = null;
  let reviewCount = 0;
  if (movieId) {
    const reviews = await strapi.db.query('api::user-review.user-review').findMany({
      where: { movie: movieId },
      select: ['rating'],
    });
    reviewCount = reviews.length;
    if (reviewCount > 0) {
      const sum = reviews.reduce((acc, row) => acc + Number(row.rating || 0), 0);
      avgRating = Math.round((sum / reviewCount) * 10) / 10;
    }
  }

  return {
    platformUsers,
    platformReady,
    interestedCount,
    isPopular,
    reviewCount,
    avgRating,
  };
}

module.exports = {
  MIN_PLATFORM_USERS,
  MIN_INTERESTED_USERS,
  countPlatformUsers,
  getPopularity,
};
