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
    { action: 'api::restaurant.restaurant.find' },
    { action: 'api::restaurant.restaurant.findOne' },
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
  const movieCount = await strapi.query('api::movie.movie').count();
  if (movieCount > 0) {
    strapi.log.info('⏭️  Seed data already exists, skipping');
    return;
  }

  strapi.log.info('🌱 Seeding data...');

  const venue1 = await strapi.query('api::venue.venue').create({
    data: {
      name: 'Αίγλη Ζαππείου', slug: 'aigli-zappiou',
      address: 'Ζάππειο Μέγαρο, Αθήνα', city: 'athens',
      google_maps_url: 'https://maps.google.com/?q=Aigli+Zappiou+Athens',
      seats_total: 350, publishedAt: new Date(),
    },
  });

  const venue2 = await strapi.query('api::venue.venue').create({
    data: {
      name: 'Ωδείο Ηρώδου Αττικού', slug: 'odeon-irodou-attikou',
      address: 'Διονυσίου Αρεοπαγίτου, Αθήνα', city: 'athens',
      google_maps_url: 'https://maps.google.com/?q=Odeon+Herodes+Atticus+Athens',
      seats_total: 5000, publishedAt: new Date(),
    },
  });

  const venue3 = await strapi.query('api::venue.venue').create({
    data: {
      name: 'Village Cinemas', slug: 'village-cinemas',
      address: 'Θηβών 228, Αιγάλεω', city: 'athens',
      google_maps_url: 'https://maps.google.com/?q=Village+Cinemas+Athens',
      seats_total: 2400, publishedAt: new Date(),
    },
  });

  const venue4 = await strapi.query('api::venue.venue').create({
    data: {
      name: 'Cineplexx Θεσσαλονίκη', slug: 'cineplexx-thessaloniki',
      address: 'Μεδεών 1, Θεσσαλονίκη', city: 'thessaloniki',
      google_maps_url: 'https://maps.google.com/?q=Cineplexx+Thessaloniki',
      seats_total: 1800, publishedAt: new Date(),
    },
  });

  strapi.log.info('✅ Venues seeded');

  const movie1 = await strapi.query('api::movie.movie').create({
    data: {
      title: 'Poor Things', slug: 'poor-things',
      synopsis: 'The incredible tale about the fantastical evolution of Bella Baxter.',
      director: 'Yorgos Lanthimos', cast: ['Emma Stone', 'Mark Ruffalo', 'Willem Dafoe'],
      genre: 'drama', duration: 141, language: 'English', age_rating: '18+',
      critic_score: 9.1, release_date: '2023-12-08',
      gradient_from: '#0f3460', gradient_to: '#16213e', publishedAt: new Date(),
    },
  });

  const movie2 = await strapi.query('api::movie.movie').create({
    data: {
      title: 'Dune: Part Two', slug: 'dune-part-two',
      synopsis: 'Paul Atreides unites with the Fremen while on a warpath of revenge.',
      director: 'Denis Villeneuve', cast: ['Timothée Chalamet', 'Zendaya', 'Austin Butler'],
      genre: 'sci-fi', duration: 166, language: 'English', age_rating: '13+',
      critic_score: 9.4, release_date: '2024-03-01',
      gradient_from: '#e8a020', gradient_to: '#1a1a2e', publishedAt: new Date(),
    },
  });

  const movie3 = await strapi.query('api::movie.movie').create({
    data: {
      title: 'Anatomy of a Fall', slug: 'anatomy-of-a-fall',
      synopsis: "A woman is suspected of her husband's murder.",
      director: 'Justine Triet', cast: ['Sandra Hüller', 'Swann Arlaud'],
      genre: 'thriller', duration: 152, language: 'French', age_rating: '16+',
      critic_score: 8.8, release_date: '2024-01-26',
      gradient_from: '#2d3436', gradient_to: '#636e72', publishedAt: new Date(),
    },
  });

  const movie4 = await strapi.query('api::movie.movie').create({
    data: {
      title: 'The Holdovers', slug: 'the-holdovers',
      synopsis: 'A curmudgeonly instructor forced to remain on campus during Christmas break.',
      director: 'Alexander Payne', cast: ['Paul Giamatti', "Da'Vine Joy Randolph"],
      genre: 'comedy', duration: 133, language: 'English', age_rating: '13+',
      critic_score: 8.5, release_date: '2024-01-19',
      gradient_from: '#0a3d62', gradient_to: '#3c6382', publishedAt: new Date(),
    },
  });

  strapi.log.info('✅ Movies seeded');

  const show1 = await strapi.query('api::theater-show.theater-show').create({
    data: {
      title: 'Μήδεια', slug: 'medea-national-theatre',
      synopsis: 'Η κλασική τραγωδία του Ευριπίδη σε μια σύγχρονη σκηνοθετική προσέγγιση.',
      director: 'Στάθης Λιβαθινός', cast: ['Μαρία Ναυπλιώτου', 'Γιώργος Κιμούλης'],
      genre: 'drama', duration: 150, tags: ['Drama', 'Classic', 'Greek Tragedy'],
      gradient_from: '#2c3e50', gradient_to: '#8e44ad',
      venue: venue2.id, publishedAt: new Date(),
    },
  });

  const show2 = await strapi.query('api::theater-show.theater-show').create({
    data: {
      title: 'Mamma Mia!', slug: 'mamma-mia',
      synopsis: 'Το αγαπημένο μιούζικαλ με τα τραγούδια των ABBA.',
      director: 'Phyllida Lloyd', cast: ['Δέσποινα Βανδή', 'Νίκος Μουτσινάς'],
      genre: 'musical', duration: 155, tags: ['Musical', 'Comedy', 'Feel-Good'],
      gradient_from: '#e74c3c', gradient_to: '#f39c12',
      venue: venue1.id, publishedAt: new Date(),
    },
  });

  const show3 = await strapi.query('api::theater-show.theater-show').create({
    data: {
      title: 'Swan Lake', slug: 'swan-lake',
      synopsis: "Tchaikovsky's timeless ballet reimagined with breathtaking choreography.",
      director: 'Matthew Bourne', cast: ['Royal Ballet Company'],
      genre: 'dance', duration: 140, tags: ['Dance', 'Ballet', 'Classic'],
      gradient_from: '#2c3e50', gradient_to: '#3498db',
      venue: venue2.id, publishedAt: new Date(),
    },
  });

  strapi.log.info('✅ Theater shows seeded');

  const now = new Date();
  const dt = (d, h, m) => {
    const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    x.setHours(h, m || 0); return x;
  };

  await strapi.query('api::showtime.showtime').create({ data: { datetime: dt(1, 19), available_seats: 80, price: 9, movie: movie1.id, venue: venue3.id, publishedAt: new Date() } });
  await strapi.query('api::showtime.showtime').create({ data: { datetime: dt(1, 21, 30), available_seats: 45, price: 9, movie: movie1.id, venue: venue3.id, publishedAt: new Date() } });
  await strapi.query('api::showtime.showtime').create({ data: { datetime: dt(2, 20), available_seats: 120, price: 11, movie: movie2.id, venue: venue3.id, publishedAt: new Date() } });
  await strapi.query('api::showtime.showtime').create({ data: { datetime: dt(2, 22, 30), available_seats: 55, price: 11, movie: movie2.id, venue: venue4.id, publishedAt: new Date() } });
  await strapi.query('api::showtime.showtime').create({ data: { datetime: dt(3, 18), available_seats: 32, price: 8, movie: movie3.id, venue: venue1.id, publishedAt: new Date() } });
  await strapi.query('api::showtime.showtime').create({ data: { datetime: dt(1, 21), available_seats: 200, price: 25, theater_show: show1.id, venue: venue2.id, publishedAt: new Date() } });
  await strapi.query('api::showtime.showtime').create({ data: { datetime: dt(3, 20), available_seats: 180, price: 30, theater_show: show2.id, venue: venue1.id, publishedAt: new Date() } });
  await strapi.query('api::showtime.showtime').create({ data: { datetime: dt(5, 20, 30), available_seats: 300, price: 35, theater_show: show3.id, venue: venue2.id, publishedAt: new Date() } });

  strapi.log.info('✅ Showtimes seeded');

  await strapi.query('api::review.review').create({ data: { title: 'A Masterwork of Absurdist Beauty', body: 'Yorgos Lanthimos delivers his most accessible yet deeply subversive film.', score: 9.1, author: 'Elena Papadaki', is_editorial: true, movie: movie1.id, publishedAt: new Date() } });
  await strapi.query('api::review.review').create({ data: { title: 'Desert Epic Redefines Sci-Fi Cinema', body: "Villeneuve's vision of Arrakis redefines what blockbuster cinema can achieve.", score: 9.4, author: 'Nikos Alexandros', is_editorial: true, movie: movie2.id, publishedAt: new Date() } });
  await strapi.query('api::review.review').create({ data: { title: 'A Haunting Night at the Odeon', body: 'This production of Medea strips the ancient text to its emotional core.', score: 8.7, author: 'Sofia Georgiou', is_editorial: true, theater_show: show1.id, publishedAt: new Date() } });
  await strapi.query('api::review.review').create({ data: { title: 'Thrilling French Courtroom Drama', body: 'Justine Triet constructs a gripping legal thriller. Sandra Hüller is exceptional.', score: 8.8, author: 'Κώστας Παπαδόπουλος', is_editorial: false, movie: movie3.id, publishedAt: new Date() } });

  strapi.log.info('✅ Reviews seeded');

  await strapi.query('api::restaurant.restaurant').create({ data: { name: 'Soil', slug: 'soil', synopsis: 'Farm-to-table fine dining στο κέντρο της Αθήνας. Εποχιακό μενού με προϊόντα από μικρούς Έλληνες παραγωγούς.', cuisine: 'mediterranean', neighborhood: 'Κολωνάκι', city: 'athens', price_range: 'upscale', address: 'Σκουφά 60, Κολωνάκι', phone: '210 3612345', website: 'https://soilathens.gr', instagram: '@soilathens', opening_date: '2026-02-14', is_new: true, gradient_from: '#1a4a1a', gradient_to: '#e8a020', editorial_score: 9.2, editorial_review: 'Το Soil είναι η πιο συναρπαστική γαστρονομική άφιξη της χρονιάς.', editorial_author: 'Μαρία Κοντού', publishedAt: new Date() } });
  await strapi.query('api::restaurant.restaurant').create({ data: { name: 'Nori Athens', slug: 'nori-athens', synopsis: 'Το πρώτο authentic omakase εστιατόριο της Αθήνας.', cuisine: 'japanese', neighborhood: 'Ψυρρή', city: 'athens', price_range: 'fine_dining', address: 'Αισχύλου 12, Ψυρρή', phone: '210 3245678', website: 'https://noriathens.gr', instagram: '@nori.athens', opening_date: '2026-01-20', is_new: true, gradient_from: '#1a1a3e', gradient_to: '#c0392b', editorial_score: 9.5, editorial_review: 'Μια εμπειρία που δεν περιμέναμε να βρούμε στην Αθήνα.', editorial_author: 'Νίκος Θεοδωρίδης', publishedAt: new Date() } });
  await strapi.query('api::restaurant.restaurant').create({ data: { name: 'Lalos Natural Wine Bar', slug: 'lalos-natural-wine-bar', synopsis: 'Wine bar με φυσικά κρασιά και small plates εμπνευσμένα από τη Μεσόγειο.', cuisine: 'mediterranean', neighborhood: 'Βουκουρεστίου', city: 'athens', price_range: 'moderate', address: 'Βουκουρεστίου 25', phone: '210 3678901', instagram: '@lalos.winebar', opening_date: '2026-03-01', is_new: true, gradient_from: '#4a1a2e', gradient_to: '#8e44ad', editorial_score: 8.7, editorial_review: 'Το Lalos καταφέρνει να είναι ταυτόχρονα relaxed και εξαιρετικό.', editorial_author: 'Ελένη Σταύρου', publishedAt: new Date() } });
  await strapi.query('api::restaurant.restaurant').create({ data: { name: 'Pikilia', slug: 'pikilia', synopsis: 'Σύγχρονη ελληνική κουζίνα με έμφαση στα ορεκτικά και τα μεζεδάκια.', cuisine: 'greek', neighborhood: 'Μοναστηράκι', city: 'athens', price_range: 'moderate', address: 'Αδριανού 45, Μοναστηράκι', phone: '210 3210987', website: 'https://pikilia.gr', instagram: '@pikilia.athens', opening_date: '2025-11-15', is_new: false, gradient_from: '#0a3d62', gradient_to: '#e8a020', editorial_score: 8.4, editorial_review: 'Η Πικιλία επαναπροσδιορίζει τι σημαίνει μεζεδοπωλείο στη σύγχρονη Αθήνα.', editorial_author: 'Κώστας Αλεξάνδρου', publishedAt: new Date() } });
  await strapi.query('api::restaurant.restaurant').create({ data: { name: 'Thalassa Rooftop', slug: 'thalassa-rooftop', synopsis: 'Seafood εστιατόριο στην ταράτσα με 360° θέα στην Αθήνα.', cuisine: 'seafood', neighborhood: 'Σύνταγμα', city: 'athens', price_range: 'fine_dining', address: 'Βασ. Γεωργίου 12, 8ος όροφος', phone: '210 3334455', website: 'https://thalassarooftop.gr', instagram: '@thalassa.rooftop', opening_date: '2026-03-20', is_new: true, gradient_from: '#0a2a4a', gradient_to: '#1abc9c', editorial_score: 8.9, editorial_review: 'Η θέα και το φαγητό αγωνίζονται για την προσοχή σου — και κερδίζουν και τα δύο.', editorial_author: 'Σοφία Βλάχου', publishedAt: new Date() } });

  strapi.log.info('✅ Restaurants seeded');
  strapi.log.info('🎉 Seed complete!');
}