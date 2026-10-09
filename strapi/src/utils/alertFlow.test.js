'use strict';

const assert = require('assert');
const path = require('path');

const sent = [];
const sendMailPath = require.resolve('./sendMail');
require.cache[sendMailPath] = {
  id: sendMailPath,
  filename: sendMailPath,
  loaded: true,
  exports: {
    sendMail: async (msg) => {
      sent.push(msg);
      return { skipped: false, messageId: `m${sent.length}` };
    },
    mailEnabled: () => true,
    mailStatus: () => ({ enabled: true }),
  },
};

const { beginMovieScreeningAlert } = require('./movieScreeningAlerts');
const {
  notifyFavoriteVenueUsersForPerformances,
  notifySubscribersForShow,
} = require('./theaterShowNotifications');

const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
const later = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

function movieStrapi() {
  const showtimes = new Map();
  const alerts = [];
  let alertSeq = 1;
  const profiles = [
    { id: 1, user: { id: 7, email: 'fan@example.com', blocked: false } },
  ];

  const strapi = {
    log: { info() {}, warn() {} },
    entityService: {
      async findOne(uid, id) {
        if (uid === 'api::showtime.showtime') return showtimes.get(id) || null;
        return null;
      },
      async findMany(uid, params) {
        if (uid === 'api::showtime.showtime') {
          const movieId = params.filters.movie.id;
          const skip = params.filters.id.$ne;
          return [...showtimes.values()].filter(
            (row) => row.movie.id === movieId && row.id !== skip && new Date(row.datetime) >= new Date(),
          ).slice(0, params.limit || 1);
        }
        if (uid === 'api::user-profile.user-profile') return profiles;
        if (uid === 'api::movie-release-alert.movie-release-alert') {
          return alerts.filter((row) => row.done !== true);
        }
        return [];
      },
      async create(uid, { data }) {
        if (alerts.some((row) => row.movie_id === data.movie_id)) {
          const err = new Error('This attribute must be unique');
          throw err;
        }
        const row = { id: alertSeq++, ...data };
        alerts.push(row);
        return row;
      },
      async update(uid, id, { data }) {
        const row = alerts.find((item) => item.id === id);
        Object.assign(row, data);
        return row;
      },
    },
    db: {
      query(uid) {
        return {
          async findOne() {
            if (uid === 'api::movie-release-alert.movie-release-alert') return alerts[0] || null;
            if (uid === 'api::movie.movie') return { id: 4, title: 'Το τάδε', slug: 'to-tade' };
            return null;
          },
          async findMany() {
            return profiles;
          },
        };
      },
    },
  };

  return { strapi, showtimes, alerts };
}

function theaterStrapi() {
  const sentPerfIds = new Set();
  let profiles = [
    { id: 1, user: { id: 7, email: 'fan@example.com', blocked: false } },
  ];
  const performances = [
    {
      id: 11,
      datetime: future,
      import_source: 'manual',
      venue: { id: 3, name: 'Απλό Θέατρο', slug: 'aplo', type: 'theater' },
      theater_show: { id: 9, title: 'Το έργο', slug: 'to-ergo', season_year: null },
    },
  ];
  const subscriptions = [
    { id: 1, user: 7, active: true, source: 'follow' },
  ];

  const strapi = {
    log: { info() {}, warn() {} },
    entityService: {
      async findMany(uid, params) {
        if (uid === 'api::theater-performance.theater-performance') {
          const ids = params.filters?.id?.$in;
          const rows = ids ? performances.filter((row) => ids.includes(row.id)) : performances;
          if (params.filters?.theater_show) {
            return rows.filter((row) => row.theater_show.id === params.filters.theater_show);
          }
          return rows;
        }
        if (uid === 'api::user-profile.user-profile') return profiles;
        return [];
      },
      async create(uid, { data }) {
        if (uid === 'api::theater-alert-sent.theater-alert-sent') {
          sentPerfIds.add(data.theater_performance);
        }
        return { id: 1, ...data };
      },
      async update() {
        return {};
      },
      async findOne() {
        return { id: 9, slug: 'to-ergo', title: 'Το έργο', season_year: null };
      },
    },
    db: {
      query(uid) {
        return {
          async findOne({ where } = {}) {
            if (uid === 'api::theater-alert-sent.theater-alert-sent') {
              return sentPerfIds.has(where.theater_performance) ? { id: 1 } : null;
            }
            if (uid === 'plugin::users-permissions.user') {
              return { id: where.id, email: 'fan@example.com', blocked: false, username: 'fan' };
            }
            if (uid === 'api::theater-show.theater-show') {
              return { id: 9, slug: 'to-ergo', title: 'Το έργο', season_year: null };
            }
            return null;
          },
          async findMany() {
            if (uid === 'api::theater-show-subscription.theater-show-subscription') {
              return subscriptions.filter((row) => row.active && row.source === 'follow');
            }
            return profiles;
          },
        };
      },
    },
    setFavorites(next) {
      profiles = next;
    },
    unsubscribe() {
      subscriptions[0].active = false;
    },
  };
  return { strapi, performances, sentPerfIds };
}

async function main() {
  sent.length = 0;
  const movie = movieStrapi();
  const now = new Date();
  movie.showtimes.set(1, {
    id: 1,
    datetime: future,
    schedule_kind: 'exact',
    import_source: 'manual',
    movie: { id: 4 },
  });

  const first = await beginMovieScreeningAlert(movie.strapi, 1, { now });
  assert.strictEqual(first.sent, 1, 'first screening emails the person who already favorited the movie');
  assert.strictEqual(sent.length, 1);
  assert.match(sent[0].subject, /Ξεκίνησαν οι προβολές/);
  assert.match(sent[0].text, /μία φορά/);

  movie.showtimes.set(2, {
    id: 2,
    datetime: later,
    schedule_kind: 'exact',
    import_source: 'manual',
    movie: { id: 4 },
  });
  const second = await beginMovieScreeningAlert(movie.strapi, 2, { now });
  assert.strictEqual(second.skipped, 'already_notified');
  assert.strictEqual(sent.length, 1, 'a later showtime does not send a second movie email');

  const lateFan = movieStrapi();
  lateFan.showtimes.set(10, {
    id: 10,
    datetime: future,
    schedule_kind: 'exact',
    import_source: 'manual',
    movie: { id: 4 },
  });
  lateFan.showtimes.set(11, {
    id: 11,
    datetime: later,
    schedule_kind: 'exact',
    import_source: 'manual',
    movie: { id: 4 },
  });
  const alreadyPlaying = await beginMovieScreeningAlert(lateFan.strapi, 11, { now });
  assert.strictEqual(alreadyPlaying.skipped, 'already_screening');
  assert.strictEqual(sent.length, 1, 'favoriting after screenings exist does not email');

  sent.length = 0;
  const theater = theaterStrapi();
  const venueFirst = await notifyFavoriteVenueUsersForPerformances(theater.strapi, [11], { now });
  assert.strictEqual(venueFirst.sent, 1, 'favorite theater gets an email for a new performance');
  const venueRepeat = await notifyFavoriteVenueUsersForPerformances(theater.strapi, [11], { now });
  assert.strictEqual(venueRepeat.sent, 0, 'the same performance is not emailed twice');

  theater.performances.push({
    id: 12,
    datetime: later,
    import_source: 'manual',
    venue: { id: 3, name: 'Απλό Θέατρο', slug: 'aplo', type: 'theater' },
    theater_show: { id: 8, title: 'Άλλο έργο', slug: 'allo', season_year: null },
  });
  const venueNext = await notifyFavoriteVenueUsersForPerformances(theater.strapi, [12], { now });
  assert.strictEqual(venueNext.sent, 1, 'a new performance at the favorite theater emails again');

  theater.strapi.setFavorites([]);
  theater.performances.push({
    id: 13,
    datetime: later,
    import_source: 'manual',
    venue: { id: 3, name: 'Απλό Θέατρο', slug: 'aplo', type: 'theater' },
    theater_show: { id: 8, title: 'Άλλο έργο', slug: 'allo', season_year: null },
  });
  const afterUnfav = await notifyFavoriteVenueUsersForPerformances(theater.strapi, [13], { now });
  assert.strictEqual(afterUnfav.sent, 0, 'removing the theater from favorites stops further emails');

  sent.length = 0;
  const follow = theaterStrapi();
  const followFirst = await notifySubscribersForShow(follow.strapi, 9, [11], { now });
  assert.strictEqual(followFirst.sent, 1, 'liked show emails when new dates appear');
  follow.strapi.unsubscribe();
  follow.performances.push({
    id: 14,
    datetime: later,
    schedule_kind: 'exact',
    venue: { name: 'Απλό Θέατρο', slug: 'aplo' },
    theater_show: { id: 9 },
  });
  const afterSeen = await notifySubscribersForShow(follow.strapi, 9, [14], { now });
  assert.strictEqual(afterSeen.sent, 0, 'Το είδα / unlike stops further show emails');

  console.log('ok', sent.map((msg) => msg.subject).join(' | ') || 'no leftover mail');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
