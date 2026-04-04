'use strict';

module.exports = {
  register(/*{ strapi }*/) {},

  async bootstrap({ strapi }) {
    await setPublicPermissions(strapi);
    await seedData(strapi);
  },
};

async function setPublicPermissions(strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) return;

  const permissionsToGrant = [
    { action: 'api::movie.movie.find' },
    { action: 'api::movie.movie.findOne' },
    { action: 'api::theater-show.theater-show.find' },
    { action: 'api::theater-show.theater-show.findOne' },
    { action: 'api::venue.venue.find' },
    { action: 'api::venue.venue.findOne' },
    { action: 'api::showtime.showtime.find' },
    { action: 'api::showtime.showtime.findOne' },
    { action: 'api::review.review.find' },
    { action: 'api::review.review.findOne' },
    { action: 'api::booking.booking.create' },
    { action: 'api::booking.booking.find' },
    { action: 'api::booking.booking.findOne' },
  ];

  for (const perm of permissionsToGrant) {
    const existing = await strapi
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action: perm.action, role: publicRole.id } });

    if (!existing) {
      await strapi.query('plugin::users-permissions.permission').create({
        data: { action: perm.action, role: publicRole.id, enabled: true },
      });
    } else if (!existing.enabled) {
      await strapi.query('plugin::users-permissions.permission').update({
        where: { id: existing.id },
        data: { enabled: true },
      });
    }
  }

  strapi.log.info('✅ Public permissions set');
}

async function seedData(strapi) {
  // Check if already seeded
  const movieCount = await strapi.query('api::movie.movie').count();
  if (movieCount > 0) {
    strapi.log.info('⏭️  Seed data already exists, skipping');
    return;
  }

  strapi.log.info('🌱 Seeding data...');

  // Venues
  const venue1 = await strapi.query('api::venue.venue').create({
    data: {
      name: 'Αίγλη Ζαππείου',
      slug: 'aigli-zappiou',
      address: 'Ζάππειο Μέγαρο, Αθήνα',
      city: 'athens',
      google_maps_url: 'https://maps.google.com/?q=Aigli+Zappiou+Athens',
      seats_total: 350,
      publishedAt: new Date(),
    },
  });

  const venue2 = await strapi.query('api::venue.venue').create({
    data: {
      name: 'Ωδείο Ηρώδου Αττικού',
      slug: 'odeon-irodou-attikou',
      address: 'Διονυσίου Αρεοπαγίτου, Αθήνα',
      city: 'athens',
      google_maps_url: 'https://maps.google.com/?q=Odeon+Herodes+Atticus+Athens',
      seats_total: 5000,
      publishedAt: new Date(),
    },
  });

  const venue3 = await strapi.query('api::venue.venue').create({
    data: {
      name: 'Village Cinemas',
      slug: 'village-cinemas',
      address: 'Θηβών 228, Αιγάλεω',
      city: 'athens',
      google_maps_url: 'https://maps.google.com/?q=Village+Cinemas+Athens',
      seats_total: 2400,
      publishedAt: new Date(),
    },
  });

  const venue4 = await strapi.query('api::venue.venue').create({
    data: {
      name: 'Cineplexx Θεσσαλονίκη',
      slug: 'cineplexx-thessaloniki',
      address: 'Μεδεών 1, Θεσσαλονίκη',
      city: 'thessaloniki',
      google_maps_url: 'https://maps.google.com/?q=Cineplexx+Thessaloniki',
      seats_total: 1800,
      publishedAt: new Date(),
    },
  });

  strapi.log.info('✅ Venues seeded');

  // Movies
  const movie1 = await strapi.query('api::movie.movie').create({
    data: {
      title: 'Poor Things',
      slug: 'poor-things',
      synopsis: 'The incredible tale about the fantastical evolution of Bella Baxter, a young woman brought back to life by the brilliant and unorthodox scientist Dr. Godwin Baxter.',
      director: 'Yorgos Lanthimos',
      cast: ['Emma Stone', 'Mark Ruffalo', 'Willem Dafoe'],
      genre: 'drama',
      duration: 141,
      language: 'English',
      age_rating: '18+',
      critic_score: 9.1,
      release_date: '2023-12-08',
      gradient_from: '#0f3460',
      gradient_to: '#16213e',
      publishedAt: new Date(),
    },
  });

  const movie2 = await strapi.query('api::movie.movie').create({
    data: {
      title: 'Dune: Part Two',
      slug: 'dune-part-two',
      synopsis: 'Paul Atreides unites with the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
      director: 'Denis Villeneuve',
      cast: ['Timothée Chalamet', 'Zendaya', 'Austin Butler'],
      genre: 'sci-fi',
      duration: 166,
      language: 'English',
      age_rating: '13+',
      critic_score: 9.4,
      release_date: '2024-03-01',
      gradient_from: '#e8a020',
      gradient_to: '#1a1a2e',
      publishedAt: new Date(),
    },
  });

  const movie3 = await strapi.query('api::movie.movie').create({
    data: {
      title: 'Anatomy of a Fall',
      slug: 'anatomy-of-a-fall',
      synopsis: 'A woman is suspected of her husband\'s murder, and their blind son faces a moral dilemma as the sole witness.',
      director: 'Justine Triet',
      cast: ['Sandra Hüller', 'Swann Arlaud', 'Milo Machado Graner'],
      genre: 'thriller',
      duration: 152,
      language: 'French',
      age_rating: '16+',
      critic_score: 8.8,
      release_date: '2024-01-26',
      gradient_from: '#2d3436',
      gradient_to: '#636e72',
      publishedAt: new Date(),
    },
  });

  const movie4 = await strapi.query('api::movie.movie').create({
    data: {
      title: 'The Holdovers',
      slug: 'the-holdovers',
      synopsis: 'A curmudgeonly instructor at a New England prep school is forced to remain on campus during Christmas break to babysit the handful of students with nowhere to go.',
      director: 'Alexander Payne',
      cast: ['Paul Giamatti', "Da'Vine Joy Randolph", 'Dominic Sessa'],
      genre: 'comedy',
      duration: 133,
      language: 'English',
      age_rating: '13+',
      critic_score: 8.5,
      release_date: '2024-01-19',
      gradient_from: '#0a3d62',
      gradient_to: '#3c6382',
      publishedAt: new Date(),
    },
  });

  strapi.log.info('✅ Movies seeded');

  // Theater Shows
  const show1 = await strapi.query('api::theater-show.theater-show').create({
    data: {
      title: 'Μήδεια',
      slug: 'medea-national-theatre',
      synopsis: 'Η κλασική τραγωδία του Ευριπίδη σε μια σύγχρονη σκηνοθετική προσέγγιση. Μια παράσταση που αγγίζει τα όρια της ανθρώπινης συναισθηματικής ακρότητας.',
      director: 'Στάθης Λιβαθινός',
      cast: ['Μαρία Ναυπλιώτου', 'Γιώργος Κιμούλης'],
      genre: 'drama',
      duration: 150,
      tags: ['Drama', 'Classic', 'Greek Tragedy'],
      gradient_from: '#2c3e50',
      gradient_to: '#8e44ad',
      venue: venue2.id,
      publishedAt: new Date(),
    },
  });

  const show2 = await strapi.query('api::theater-show.theater-show').create({
    data: {
      title: 'Mamma Mia!',
      slug: 'mamma-mia',
      synopsis: 'Το αγαπημένο μιούζικαλ με τα τραγούδια των ABBA σε μια λαμπερή παράσταση γεμάτη χρώμα, ζωή και ευθυμία.',
      director: 'Phyllida Lloyd',
      cast: ['Δέσποινα Βανδή', 'Νίκος Μουτσινάς'],
      genre: 'musical',
      duration: 155,
      tags: ['Musical', 'Comedy', 'Feel-Good'],
      gradient_from: '#e74c3c',
      gradient_to: '#f39c12',
      venue: venue1.id,
      publishedAt: new Date(),
    },
  });

  const show3 = await strapi.query('api::theater-show.theater-show').create({
    data: {
      title: 'Swan Lake',
      slug: 'swan-lake',
      synopsis: "Tchaikovsky's timeless ballet reimagined with breathtaking choreography and a spectacular cast of international dancers.",
      director: 'Matthew Bourne',
      cast: ['Royal Ballet Company'],
      genre: 'dance',
      duration: 140,
      tags: ['Dance', 'Ballet', 'Classic'],
      gradient_from: '#2c3e50',
      gradient_to: '#3498db',
      venue: venue2.id,
      publishedAt: new Date(),
    },
  });

  strapi.log.info('✅ Theater shows seeded');

  // Showtimes
  const now = new Date();
  const day = (d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
  const dt = (d, h, m) => { const x = day(d); x.setHours(h, m || 0); return x; };

  await strapi.query('api::showtime.showtime').create({
    data: { datetime: dt(1, 19), available_seats: 80, price: 9, movie: movie1.id, venue: venue3.id, publishedAt: new Date() },
  });
  await strapi.query('api::showtime.showtime').create({
    data: { datetime: dt(1, 21, 30), available_seats: 45, price: 9, movie: movie1.id, venue: venue3.id, publishedAt: new Date() },
  });
  await strapi.query('api::showtime.showtime').create({
    data: { datetime: dt(2, 20), available_seats: 120, price: 11, movie: movie2.id, venue: venue3.id, publishedAt: new Date() },
  });
  await strapi.query('api::showtime.showtime').create({
    data: { datetime: dt(2, 22, 30), available_seats: 55, price: 11, movie: movie2.id, venue: venue4.id, publishedAt: new Date() },
  });
  await strapi.query('api::showtime.showtime').create({
    data: { datetime: dt(3, 18), available_seats: 32, price: 8, movie: movie3.id, venue: venue1.id, publishedAt: new Date() },
  });
  await strapi.query('api::showtime.showtime').create({
    data: { datetime: dt(1, 21), available_seats: 200, price: 25, theater_show: show1.id, venue: venue2.id, publishedAt: new Date() },
  });
  await strapi.query('api::showtime.showtime').create({
    data: { datetime: dt(3, 20), available_seats: 180, price: 30, theater_show: show2.id, venue: venue1.id, publishedAt: new Date() },
  });
  await strapi.query('api::showtime.showtime').create({
    data: { datetime: dt(5, 20, 30), available_seats: 300, price: 35, theater_show: show3.id, venue: venue2.id, publishedAt: new Date() },
  });

  strapi.log.info('✅ Showtimes seeded');

  // Reviews
  await strapi.query('api::review.review').create({
    data: {
      title: 'A Masterwork of Absurdist Beauty',
      body: 'Yorgos Lanthimos delivers his most accessible yet deeply subversive film to date. Emma Stone is transcendent, commanding every frame with otherworldly physicality and raw emotional intelligence.',
      score: 9.1,
      author: 'Elena Papadaki',
      is_editorial: true,
      movie: movie1.id,
      publishedAt: new Date(),
    },
  });

  await strapi.query('api::review.review').create({
    data: {
      title: 'Desert Epic Redefines Sci-Fi Cinema',
      body: "Villeneuve's vision of Arrakis is so vast and immersive that it redefines what blockbuster cinema can achieve. A monumental achievement in visual storytelling.",
      score: 9.4,
      author: 'Nikos Alexandros',
      is_editorial: true,
      movie: movie2.id,
      publishedAt: new Date(),
    },
  });

  await strapi.query('api::review.review').create({
    data: {
      title: 'A Haunting Night at the Odeon',
      body: 'This production of Medea strips the ancient text to its emotional core, with Nauplioti delivering a career-defining performance under the stars of the Acropolis.',
      score: 8.7,
      author: 'Sofia Georgiou',
      is_editorial: true,
      theater_show: show1.id,
      publishedAt: new Date(),
    },
  });

  await strapi.query('api::review.review').create({
    data: {
      title: 'Thrilling French Courtroom Drama',
      body: 'Justine Triet constructs a gripping legal thriller that doubles as a devastating portrait of a marriage. Sandra Hüller is exceptional.',
      score: 8.8,
      author: 'Κώστας Παπαδόπουλος',
      is_editorial: false,
      movie: movie3.id,
      publishedAt: new Date(),
    },
  });

  strapi.log.info('✅ Reviews seeded');
  strapi.log.info('🎉 Seed complete!');
}
