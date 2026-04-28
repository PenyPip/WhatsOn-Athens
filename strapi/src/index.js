'use strict';

module.exports = {
  async bootstrap({ strapi }) {
    const movieCount = await strapi.db.query('api::movie.movie').count();
    if (movieCount > 0) {
      strapi.log.info('⏭️  Seed data already exists, skipping...');
      return;
    }

    strapi.log.info('🎬 Seeding WhatSON Athens data...');

    // ─── Venues ───
    const venues = await Promise.all([
      strapi.entityService.create('api::venue.venue', { data: { name: 'Εθνικό Θέατρο', slug: 'ethniko-theatro', address: 'Αγίου Κωνσταντίνου 22-24, Αθήνα', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/ethniko', seats_total: 800, type: 'Θέατρο', publishedAt: new Date() } }),
      strapi.entityService.create('api::venue.venue', { data: { name: 'Μέγαρο Μουσικής Αθηνών', slug: 'megaro-mousikis', address: 'Βασ. Σοφίας & Κοκκάλη, Αθήνα', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/megaro', seats_total: 1900, type: 'Μουσική Σκηνή', publishedAt: new Date() } }),
      strapi.entityService.create('api::venue.venue', { data: { name: 'Village Cinemas @ The Mall', slug: 'village-the-mall', address: 'Ανδρέα Παπανδρέου 35, Μαρούσι', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/village', seats_total: 2500, type: 'Σινεμά', publishedAt: new Date() } }),
      strapi.entityService.create('api::venue.venue', { data: { name: 'Ολύμπιον', slug: 'olympion', address: 'Πλατεία Αριστοτέλους 10, Θεσσαλονίκη', city: 'thessaloniki', google_maps_url: 'https://maps.app.goo.gl/olympion', seats_total: 400, type: 'Σινεμά', publishedAt: new Date() } }),
      strapi.entityService.create('api::venue.venue', { data: { name: 'Θέατρο Παλλάς', slug: 'theatro-pallas', address: 'Βουκουρεστίου 5, Αθήνα', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/pallas', seats_total: 1100, type: 'Θέατρο', publishedAt: new Date() } }),
      strapi.entityService.create('api::venue.venue', { data: { name: 'Ίδρυμα Σταύρος Νιάρχος', slug: 'snfcc', address: 'Λεωφ. Συγγρού 364, Καλλιθέα', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/snfcc', seats_total: 1400, type: 'Πολυχώρος', publishedAt: new Date() } }),
    ]);
    strapi.log.info('✅ Venues seeded');

    // ─── Movies ───
    const movies = await Promise.all([
      strapi.entityService.create('api::movie.movie', { data: { title: 'Ο Μελισσοκόμος', slug: 'o-melissokomos', synopsis: 'Ένας συνταξιούχος δάσκαλος εγκαταλείπει τα πάντα για να ακολουθήσει τις μέλισσες.', director: 'Θόδωρος Αγγελόπουλος', cast: ['Μαρτσέλο Μαστρογιάνι', 'Νάντια Μουρούζη'], genre: 'drama', duration: 122, language: 'Ελληνικά', age_rating: '16+', critic_score: 8.9, release_date: '2025-01-15', gradient_from: '#f0c27f', gradient_to: '#4b1248', publishedAt: new Date() } }),
      strapi.entityService.create('api::movie.movie', { data: { title: 'Poor Things', slug: 'poor-things', synopsis: 'Η απίστευτη ιστορία εξέλιξης της Μπέλα Μπάξτερ.', director: 'Γιώργος Λάνθιμος', cast: ['Έμα Στόουν', 'Μαρκ Ράφαλο', 'Γουίλεμ Νταφόε'], genre: 'comedy', duration: 141, language: 'Αγγλικά', age_rating: '18+', critic_score: 9.1, release_date: '2025-02-08', gradient_from: '#667eea', gradient_to: '#764ba2', publishedAt: new Date() } }),
      strapi.entityService.create('api::movie.movie', { data: { title: 'Dune: Μέρος Δύο', slug: 'dune-meros-dyo', synopsis: 'Ο Πολ Ατρέιντις ενώνεται με τους Φρίμεν.', director: 'Ντενί Βιλνέβ', cast: ['Τιμοτέ Σαλαμέ', 'Ζεντάγια', 'Φλόρενς Πιού'], genre: 'sci-fi', duration: 166, language: 'Αγγλικά', age_rating: '13+', critic_score: 9.4, release_date: '2025-03-01', gradient_from: '#f5af19', gradient_to: '#f12711', publishedAt: new Date() } }),
      strapi.entityService.create('api::movie.movie', { data: { title: 'Ανατομία μιας Πτώσης', slug: 'anatomia-mias-ptosis', synopsis: 'Μια γυναίκα υποψιάζεται για τη δολοφονία του συζύγου της.', director: 'Ζιστίν Τριέ', cast: ['Σάντρα Χίλερ', 'Σουάν Αρλό'], genre: 'thriller', duration: 152, language: 'Γαλλικά', age_rating: '16+', critic_score: 8.8, release_date: '2025-01-26', gradient_from: '#bdc3c7', gradient_to: '#2c3e50', publishedAt: new Date() } }),
      strapi.entityService.create('api::movie.movie', { data: { title: 'Ζώνη Ενδιαφέροντος', slug: 'zoni-endiaferontos', synopsis: 'Ο διοικητής του Άουσβιτς και η γυναίκα του.', director: 'Τζόναθαν Γκλέιζερ', cast: ['Κρίστιαν Φρίντελ', 'Σάντρα Χίλερ'], genre: 'drama', duration: 105, language: 'Γερμανικά', age_rating: '16+', critic_score: 9.0, release_date: '2025-02-15', gradient_from: '#2d3436', gradient_to: '#636e72', publishedAt: new Date() } }),
      strapi.entityService.create('api::movie.movie', { data: { title: 'Challengers', slug: 'challengers', synopsis: 'Ένας πρώην πρωταθλητής τένις.', director: 'Λούκα Γκουαντανίνο', cast: ['Ζεντάγια', 'Μάικ Φέιστ'], genre: 'drama', duration: 131, language: 'Αγγλικά', age_rating: '13+', critic_score: 8.3, release_date: '2025-04-01', gradient_from: '#e55d87', gradient_to: '#5fc3e4', publishedAt: new Date() } }),
      strapi.entityService.create('api::movie.movie', { data: { title: 'Οι Απομείναντες', slug: 'oi-apomeinantes', synopsis: 'Ένας γκρινιάρης καθηγητής μένει στο campus τα Χριστούγεννα.', director: 'Αλεξάντερ Πέιν', cast: ['Πολ Τζιαμάτι', 'Ντα\'βάιν Τζόι Ράντολφ'], genre: 'comedy', duration: 133, language: 'Αγγλικά', age_rating: '13+', critic_score: 8.5, release_date: '2025-01-19', gradient_from: '#2193b0', gradient_to: '#6dd5ed', publishedAt: new Date() } }),
    ]);
    strapi.log.info('✅ Movies seeded');

    // ─── Theater Shows ───
    const shows = await Promise.all([
      strapi.entityService.create('api::theater-show.theater-show', { data: { title: 'Μήδεια', slug: 'mideia', synopsis: 'Η κλασική τραγωδία του Ευριπίδη.', director: 'Στάθης Λιβαθινός', cast: ['Μαρία Ναυπλιώτου', 'Γιάννης Στάνκογλου'], genre: 'drama', duration: 150, tags: ['Αρχαίο Δράμα', 'Τραγωδία'], gradient_from: '#c94b4b', gradient_to: '#4b134f', is_premiere: true, venue: venues[0].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::theater-show.theater-show', { data: { title: 'Mamma Mia!', slug: 'mamma-mia', synopsis: 'Το αγαπημένο μιούζικαλ με τα τραγούδια των ABBA!', director: 'Φυλλίδα Λόιντ', cast: ['Δέσποινα Βανδή', 'Πέτρος Μπουσουλόπουλος'], genre: 'musical', duration: 155, tags: ['Μιούζικαλ', 'Κωμωδία'], gradient_from: '#fc5c7d', gradient_to: '#6a82fb', venue: venues[4].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::theater-show.theater-show', { data: { title: 'Η Λίμνη των Κύκνων', slug: 'limni-ton-kyknon', synopsis: 'Κλασικό μπαλέτο του Τσαϊκόφσκι.', director: 'Μάθιου Μπορν', cast: ['Μπαλέτο Εθνικής Λυρικής Σκηνής'], genre: 'dance', duration: 140, tags: ['Χορός', 'Μπαλέτο'], gradient_from: '#0f2027', gradient_to: '#2c5364', venue: venues[5].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::theater-show.theater-show', { data: { title: 'Περιμένοντας τον Γκοντό', slug: 'perimenondas-ton-gkonto', synopsis: 'Δύο αλήτες περιμένουν κάποιον που δεν θα έρθει ποτέ.', director: 'Γιάννης Χουβαρδάς', cast: ['Λάζαρος Γεωργακόπουλος', 'Θανάσης Τσαλταμπάσης'], genre: 'comedy', duration: 120, tags: ['Θέατρο του Παραλόγου'], gradient_from: '#373B44', gradient_to: '#4286f4', is_premiere: true, venue: venues[0].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::theater-show.theater-show', { data: { title: 'Η Γυάλινη Μενατζερί', slug: 'gyalini-menatzeri', synopsis: 'Το αριστούργημα του Τένεσι Ουίλιαμς.', director: 'Δημήτρης Παπαϊωάννου', cast: ['Αμαλία Μουτούση', 'Λαέρτης Βασιλείου'], genre: 'drama', duration: 135, tags: ['Δράμα', 'Κλασικό'], gradient_from: '#11998e', gradient_to: '#38ef7d', is_last_shows: true, venue: venues[1].id, publishedAt: new Date() } }),
    ]);
    strapi.log.info('✅ Theater Shows seeded');

    // ─── Restaurants ───
    const restaurants = await Promise.all([
      strapi.entityService.create('api::restaurant.restaurant', { data: { name: 'Nolan', slug: 'nolan-athens', synopsis: 'Πρωτοποριακή ιαπωνο-ελληνική κουζίνα.', cuisine: 'Ιαπωνο-ελληνική', neighborhood: 'Σύνταγμα', city: 'athens', price_range: '€€€', address: 'Βουλής 31-33', phone: '210 3244046', website: 'https://nolan.gr', instagram: '@nolan_athens', opening_date: '2025-01-15', is_new: true, editorial_score: 9.0, gradient_from: '#1a1a2e', gradient_to: '#e94560', publishedAt: new Date() } }),
      strapi.entityService.create('api::restaurant.restaurant', { data: { name: 'Spondi', slug: 'spondi', synopsis: 'Γαλλο-μεσογειακή κουζίνα 2 αστέρων Michelin.', cuisine: 'Γαλλο-μεσογειακή', neighborhood: 'Παγκράτι', city: 'athens', price_range: '€€€€', address: 'Πύρρωνος 5', website: 'https://spondi.gr', instagram: '@spondirestaurant', is_new: false, editorial_score: 9.5, gradient_from: '#2c3e50', gradient_to: '#4ca1af', publishedAt: new Date() } }),
      strapi.entityService.create('api::restaurant.restaurant', { data: { name: 'ΕΡΓΟΝ Αγορά', slug: 'ergon-agora', synopsis: 'Ελληνικά προϊόντα σε αγορά-εστιατόριο concept.', cuisine: 'Ελληνική', neighborhood: 'Σύνταγμα', city: 'athens', price_range: '€€', address: 'Μητροπόλεως 23', website: 'https://ergonfoods.com', instagram: '@ergonfoods', opening_date: '2025-02-01', is_new: true, editorial_score: 8.2, gradient_from: '#56ab2f', gradient_to: '#a8e063', publishedAt: new Date() } }),
      strapi.entityService.create('api::restaurant.restaurant', { data: { name: 'Funky Gourmet', slug: 'funky-gourmet', synopsis: 'Μοριακή γαστρονομία 2 αστέρων Michelin.', cuisine: 'Μοριακή Γαστρονομία', neighborhood: 'Κεραμεικός', city: 'athens', price_range: '€€€€', address: 'Παραμυθίας 13', website: 'https://funkygourmet.com', instagram: '@funkygourmet', opening_date: '2025-03-01', is_new: true, editorial_score: 9.2, gradient_from: '#e44d26', gradient_to: '#f16529', publishedAt: new Date() } }),
      strapi.entityService.create('api::restaurant.restaurant', { data: { name: 'Αμά Λαχεί', slug: 'ama-lachei', synopsis: 'Αυθεντικό μεζεδοπωλείο στου Ψυρρή.', cuisine: 'Ελληνική - Μεζεδοπωλείο', neighborhood: 'Ψυρρή', city: 'athens', price_range: '€€', address: 'Σοφοκλέους 69', instagram: '@amalaxei_psiri', is_new: false, gradient_from: '#f7971e', gradient_to: '#ffd200', publishedAt: new Date() } }),
      strapi.entityService.create('api::restaurant.restaurant', { data: { name: 'Κουζίνα 42', slug: 'kouzina-42', synopsis: 'Σύγχρονη ελληνική κουζίνα στο Κολωνάκι.', cuisine: 'Νεοελληνική', neighborhood: 'Κολωνάκι', city: 'athens', price_range: '€€€', address: 'Σκουφά 42', instagram: '@kouzina42', opening_date: '2025-03-15', is_new: true, editorial_score: 8.7, gradient_from: '#834d9b', gradient_to: '#d04ed6', publishedAt: new Date() } }),
    ]);
    strapi.log.info('✅ Restaurants seeded');

    // ─── Showtimes ───
    const futureDate = (daysAhead, hour) => {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };

    await Promise.all([
      strapi.entityService.create('api::showtime.showtime', { data: { datetime: futureDate(1, 19), available_seats: 45, price: 9, movie: movies[0].id, venue: venues[2].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::showtime.showtime', { data: { datetime: futureDate(1, 21), available_seats: 32, price: 9, movie: movies[1].id, venue: venues[2].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::showtime.showtime', { data: { datetime: futureDate(2, 17), available_seats: 80, price: 8, movie: movies[2].id, venue: venues[3].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::showtime.showtime', { data: { datetime: futureDate(2, 20), available_seats: 60, price: 10, movie: movies[3].id, venue: venues[2].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::showtime.showtime', { data: { datetime: futureDate(2, 20), available_seats: 55, price: 18, theater_show: shows[0].id, venue: venues[0].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::showtime.showtime', { data: { datetime: futureDate(3, 21), available_seats: 120, price: 25, theater_show: shows[1].id, venue: venues[4].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::showtime.showtime', { data: { datetime: futureDate(5, 20), available_seats: 150, price: 30, theater_show: shows[2].id, venue: venues[5].id, publishedAt: new Date() } }),
    ]);
    strapi.log.info('✅ Showtimes seeded');

    // ─── Editorial Reviews ───
    await Promise.all([
      strapi.entityService.create('api::editorial-review.editorial-review', { data: { title: 'Ένα Αριστούργημα Παραλογίας', slug: 'poor-things-masterwork', body: 'Ο Γιώργος Λάνθιμος παραδίδει την πιο ανατρεπτική ταινία του.', score: 9.1, author: 'Ελένη Παπαδάκη', category: 'movie', movie: movies[1].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::editorial-review.editorial-review', { data: { title: 'Το Sci-Fi Ξαναορίζεται', slug: 'dune-2-sci-fi', body: 'Το όραμα του Βιλνέβ ξαναορίζει τα δεδομένα του είδους.', score: 9.4, author: 'Νίκος Αλεξάνδρου', category: 'movie', movie: movies[2].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::editorial-review.editorial-review', { data: { title: 'Μια Ηλεκτρική Βραδιά στο Εθνικό', slug: 'mideia-national', body: 'Η Μαρία Ναυπλιώτου δίνει ερμηνεία σταθμό ως Μήδεια.', score: 8.7, author: 'Σοφία Γεωργίου', category: 'theater', theater_show: shows[0].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::editorial-review.editorial-review', { data: { title: 'Nolan: Η Αθήνα Συναντά το Τόκιο', slug: 'nolan-review', body: 'Εκπληκτική fusion εμπειρία.', score: 9.0, author: 'Μαρία Κοντοπούλου', category: 'restaurant', restaurant: restaurants[0].id, publishedAt: new Date() } }),
    ]);
    strapi.log.info('✅ Editorial Reviews seeded');

    // ─── User Reviews ───
    await Promise.all([
      strapi.entityService.create('api::user-review.user-review', { data: { user_name: 'Γιώργος Μ.', content_type: 'movie', rating: 4.5, body: 'Εξαιρετική ταινία!', movie: movies[1].id, publishedAt: new Date() } }),
      strapi.entityService.create('api::user-review.user-review', { data: { user_name: 'Μαρία Π.', content_type: 'theater', rating: 5.0, body: 'Η Ναυπλιώτου ήταν συγκλονιστική.', theater_show: shows[0].id, publishedAt: new Date() } }),
    ]);
    strapi.log.info('✅ User Reviews seeded');

    strapi.log.info('🎉 WhatSON Athens seed complete!');
  },
};