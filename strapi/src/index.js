'use strict';

module.exports = {
  async bootstrap({ strapi }) {
    // Check if already seeded
    const movieCount = await strapi.db.query('api::movie.movie').count();
    if (movieCount > 0) {
      strapi.log.info('Seed data already exists, skipping...');
      return;
    }

    strapi.log.info('🎬 Seeding WhatSON Athens data...');
    const now = new Date();

    // ─── Venues ───
    const venues = await Promise.all([
      strapi.db.query('api::venue.venue').create({ data: { name: 'Εθνικό Θέατρο', slug: 'ethniko-theatro', address: 'Αγίου Κωνσταντίνου 22-24, Αθήνα', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/ethniko', seats_total: 800, type: 'Θέατρο', publishedAt: now } }),
      strapi.db.query('api::venue.venue').create({ data: { name: 'Μέγαρο Μουσικής Αθηνών', slug: 'megaro-mousikis', address: 'Βασ. Σοφίας & Κοκκάλη, Αθήνα', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/megaro', seats_total: 1900, type: 'Μουσική Σκηνή', publishedAt: now } }),
      strapi.db.query('api::venue.venue').create({ data: { name: 'Village Cinemas @ The Mall', slug: 'village-the-mall', address: 'Ανδρέα Παπανδρέου 35, Μαρούσι', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/village', seats_total: 2500, type: 'Σινεμά', publishedAt: now } }),
      strapi.db.query('api::venue.venue').create({ data: { name: 'Ολύμπιον', slug: 'olympion', address: 'Πλατεία Αριστοτέλους 10, Θεσσαλονίκη', city: 'thessaloniki', google_maps_url: 'https://maps.app.goo.gl/olympion', seats_total: 400, type: 'Σινεμά', publishedAt: now } }),
      strapi.db.query('api::venue.venue').create({ data: { name: 'Θέατρο Παλλάς', slug: 'theatro-pallas', address: 'Βουκουρεστίου 5, Αθήνα', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/pallas', seats_total: 1100, type: 'Θέατρο', publishedAt: now } }),
      strapi.db.query('api::venue.venue').create({ data: { name: 'Ίδρυμα Σταύρος Νιάρχος', slug: 'snfcc', address: 'Λεωφ. Συγγρού 364, Καλλιθέα', city: 'athens', google_maps_url: 'https://maps.app.goo.gl/snfcc', seats_total: 1400, type: 'Πολυχώρος', publishedAt: now } }),
    ]);

    strapi.log.info('✅ Venues seeded');

    // ─── Movies ───
    const movies = await Promise.all([
      strapi.db.query('api::movie.movie').create({ data: {
        title: 'Ο Μελισσοκόμος', slug: 'o-melissokomos',
        synopsis: 'Ένας συνταξιούχος δάσκαλος εγκαταλείπει τα πάντα για να ακολουθήσει τις μέλισσες σε ένα ταξίδι από τη βόρεια στη νότια Ελλάδα. Μια βαθιά στοχαστική ταινία για τη μοναξιά, τη φύση και τα όρια της ανθρώπινης ύπαρξης.',
        director: 'Θόδωρος Αγγελόπουλος', cast: ['Μαρτσέλο Μαστρογιάνι', 'Νάντια Μουρούζη'],
        genre: 'drama', duration: 122, language: 'Ελληνικά', age_rating: '16+',
        critic_score: 8.9, release_date: '2025-01-15', trailer_url: 'https://youtube.com/watch?v=example1',
        gradient_from: '#f0c27f', gradient_to: '#4b1248', publishedAt: now
      }}),
      strapi.db.query('api::movie.movie').create({ data: {
        title: 'Poor Things', slug: 'poor-things',
        synopsis: 'Η απίστευτη ιστορία και η εξέλιξη της Μπέλα Μπάξτερ, μιας νεαρής γυναίκας που αναστήθηκε από τον ιδιοφυή αλλά αντισυμβατικό επιστήμονα Δρ. Γκόντγουιν Μπάξτερ.',
        director: 'Γιώργος Λάνθιμος', cast: ['Έμα Στόουν', 'Μαρκ Ράφαλο', 'Γουίλεμ Νταφόε'],
        genre: 'comedy', duration: 141, language: 'Αγγλικά', age_rating: '18+',
        critic_score: 9.1, release_date: '2025-02-08',
        gradient_from: '#667eea', gradient_to: '#764ba2', publishedAt: now
      }}),
      strapi.db.query('api::movie.movie').create({ data: {
        title: 'Dune: Μέρος Δύο', slug: 'dune-meros-dyo',
        synopsis: 'Ο Πολ Ατρέιντις ενώνεται με τους Φρίμεν ενώ αναζητά τρόπο να αποτρέψει ένα τρομερό μέλλον που μόνο αυτός μπορεί να προβλέψει. Καθώς η αγάπη του βρίσκεται σε σύγκρουση με τη μοίρα του σύμπαντος.',
        director: 'Ντενί Βιλνέβ', cast: ['Τιμοτέ Σαλαμέ', 'Ζεντάγια', 'Φλόρενς Πιού', 'Όστιν Μπάτλερ'],
        genre: 'sci-fi', duration: 166, language: 'Αγγλικά', age_rating: '13+',
        critic_score: 9.4, release_date: '2025-03-01',
        gradient_from: '#f5af19', gradient_to: '#f12711', publishedAt: now
      }}),
      strapi.db.query('api::movie.movie').create({ data: {
        title: 'Ανατομία μιας Πτώσης', slug: 'anatomia-mias-ptosis',
        synopsis: 'Μια γυναίκα υποψιάζεται για τη δολοφονία του συζύγου της. Η δίκη μετατρέπεται σε ανατομία ενός γάμου και αναδεικνύει τα σκοτεινά μυστικά μιας οικογένειας.',
        director: 'Ζιστίν Τριέ', cast: ['Σάντρα Χίλερ', 'Σουάν Αρλό'],
        genre: 'thriller', duration: 152, language: 'Γαλλικά', age_rating: '16+',
        critic_score: 8.8, release_date: '2025-01-26',
        gradient_from: '#bdc3c7', gradient_to: '#2c3e50', publishedAt: now
      }}),
      strapi.db.query('api::movie.movie').create({ data: {
        title: 'Οι Απομείναντες', slug: 'oi-apomeinantes',
        synopsis: 'Ένας γκρινιάρης καθηγητής αρχαίων μένει στο campus τα Χριστούγεννα μαζί με έναν ανυπότακτο μαθητή και μια μαγείρισσα σε πένθος. Μια απρόσμενη φιλία ξεπηδά.',
        director: 'Αλεξάντερ Πέιν', cast: ['Πολ Τζιαμάτι', 'Ντα\'βάιν Τζόι Ράντολφ'],
        genre: 'comedy', duration: 133, language: 'Αγγλικά', age_rating: '13+',
        critic_score: 8.5, release_date: '2025-01-19',
        gradient_from: '#2193b0', gradient_to: '#6dd5ed', publishedAt: now
      }}),
      strapi.db.query('api::movie.movie').create({ data: {
        title: 'Ζώνη Ενδιαφέροντος', slug: 'zoni-endiaferontos',
        synopsis: 'Ο διοικητής του Άουσβιτς Ρούντολφ Χες και η γυναίκα του Χέντβιχ προσπαθούν να χτίσουν μια ονειρεμένη ζωή δίπλα στο στρατόπεδο.',
        director: 'Τζόναθαν Γκλέιζερ', cast: ['Κρίστιαν Φρίντελ', 'Σάντρα Χίλερ'],
        genre: 'drama', duration: 105, language: 'Γερμανικά', age_rating: '16+',
        critic_score: 9.0, release_date: '2025-02-15',
        gradient_from: '#2d3436', gradient_to: '#636e72', publishedAt: now
      }}),
      strapi.db.query('api::movie.movie').create({ data: {
        title: 'Challengers', slug: 'challengers',
        synopsis: 'Ένας πρώην πρωταθλητής τένις, που έγινε προπονητής, μετατρέπει τον σύζυγό της σε φαινόμενο του κόσμου. Αλλά το σχέδιο περιπλέκεται όταν αντιμετωπίζει έναν παλιό φίλο.',
        director: 'Λούκα Γκουαντανίνο', cast: ['Ζεντάγια', 'Μάικ Φέιστ', 'Τζος Ο\'Κόνορ'],
        genre: 'drama', duration: 131, language: 'Αγγλικά', age_rating: '13+',
        critic_score: 8.3, release_date: '2025-04-01',
        gradient_from: '#e55d87', gradient_to: '#5fc3e4', publishedAt: now
      }}),
    ]);

    strapi.log.info('✅ Movies seeded');

    // ─── Theater Shows ───
    const shows = await Promise.all([
      strapi.db.query('api::theater-show.theater-show').create({ data: {
        title: 'Μήδεια', slug: 'mideia',
        synopsis: 'Η κλασική τραγωδία του Ευριπίδη σε μια σύγχρονη, ηλεκτρισμένη σκηνοθεσία. Η Μήδεια, προδομένη από τον Ιάσονα, σχεδιάζει μια τρομερή εκδίκηση.',
        director: 'Στάθης Λιβαθινός', cast: ['Μαρία Ναυπλιώτου', 'Γιάννης Στάνκογλου'],
        genre: 'drama', duration: 150, tags: ['Αρχαίο Δράμα', 'Τραγωδία', 'Κλασικό'],
        gradient_from: '#c94b4b', gradient_to: '#4b134f',
        is_premiere: true, venue: venues[0].id, publishedAt: now
      }}),
      strapi.db.query('api::theater-show.theater-show').create({ data: {
        title: 'Mamma Mia!', slug: 'mamma-mia',
        synopsis: 'Το αγαπημένο μιούζικαλ με τα αθάνατα τραγούδια των ABBA! Μια νεαρή γυναίκα σε ένα ελληνικό νησί ψάχνει τον πατέρα της ανάμεσα σε τρεις υποψήφιους.',
        director: 'Φυλλίδα Λόιντ', cast: ['Δέσποινα Βανδή', 'Πέτρος Μπουσουλόπουλος'],
        genre: 'musical', duration: 155, tags: ['Μιούζικαλ', 'Κωμωδία', 'ABBA'],
        gradient_from: '#fc5c7d', gradient_to: '#6a82fb',
        venue: venues[4].id, publishedAt: now
      }}),
      strapi.db.query('api::theater-show.theater-show').create({ data: {
        title: 'Η Γυάλινη Μενατζερί', slug: 'gyalini-menatzeri',
        synopsis: 'Το αριστούργημα του Τένεσι Ουίλιαμς. Μια μητέρα ζει στην ψευδαίσθηση ενός ένδοξου παρελθόντος, ενώ η κόρη της κρύβεται πίσω από τη συλλογή γυάλινων ζωάκων.',
        director: 'Δημήτρης Παπαϊωάννου', cast: ['Αμαλία Μουτούση', 'Λαέρτης Βασιλείου'],
        genre: 'drama', duration: 135, tags: ['Δράμα', 'Κλασικό', 'Αμερικανικό Θέατρο'],
        gradient_from: '#11998e', gradient_to: '#38ef7d',
        is_last_shows: true, venue: venues[1].id, publishedAt: now
      }}),
      strapi.db.query('api::theater-show.theater-show').create({ data: {
        title: 'Η Λίμνη των Κύκνων', slug: 'limni-ton-kyknon',
        synopsis: 'Κλασικό μπαλέτο του Τσαϊκόφσκι σε μια σύγχρονη εκδοχή. Η αιώνια ιστορία αγάπης μεταξύ πρίγκιπα και κύκνου σε χορογραφία που κόβει την ανάσα.',
        director: 'Μάθιου Μπορν', cast: ['Μπαλέτο Εθνικής Λυρικής Σκηνής'],
        genre: 'dance', duration: 140, tags: ['Χορός', 'Μπαλέτο', 'Κλασική Μουσική'],
        gradient_from: '#0f2027', gradient_to: '#2c5364',
        venue: venues[5].id, publishedAt: now
      }}),
      strapi.db.query('api::theater-show.theater-show').create({ data: {
        title: 'Περιμένοντας τον Γκοντό', slug: 'perimenondas-ton-gkonto',
        synopsis: 'Δύο αλήτες περιμένουν κάποιον που δεν θα έρθει ποτέ. Η κορυφαία παράσταση του θεάτρου του παραλόγου, σε νέα μετάφραση.',
        director: 'Γιάννης Χουβαρδάς', cast: ['Λάζαρος Γεωργακόπουλος', 'Θανάσης Τσαλταμπάσης'],
        genre: 'comedy', duration: 120, tags: ['Θέατρο του Παραλόγου', 'Κλασικό', 'Μπέκετ'],
        gradient_from: '#373B44', gradient_to: '#4286f4',
        is_premiere: true, venue: venues[0].id, publishedAt: now
      }}),
    ]);

    strapi.log.info('✅ Theater Shows seeded');

    // ─── Restaurants ───
    const restaurants = await Promise.all([
      strapi.db.query('api::restaurant.restaurant').create({ data: {
        name: 'Nolan', slug: 'nolan-athens',
        synopsis: 'Πρωτοποριακή ιαπωνο-ελληνική κουζίνα σε ένα κομψό σκηνικό στην καρδιά της Αθήνας. Ο σεφ Σωτήρης Κοντιζάς δημιουργεί ένα μοναδικό fusion γαστρονομικό ταξίδι.',
        cuisine: 'Ιαπωνο-ελληνική', neighborhood: 'Σύνταγμα', city: 'athens',
        price_range: '€€€', address: 'Βουλής 31-33, 105 57', phone: '210 3244046',
        website: 'https://nolan.gr', instagram: '@nolan_athens',
        opening_date: '2025-01-15', is_new: true, editorial_score: 9.0,
        gradient_from: '#1a1a2e', gradient_to: '#e94560', publishedAt: now
      }}),
      strapi.db.query('api::restaurant.restaurant').create({ data: {
        name: 'Spondi', slug: 'spondi',
        synopsis: 'Γαλλο-μεσογειακή κουζίνα 2 αστέρων Michelin σε ένα νεοκλασικό κτίριο με αυλή. Μια εμπειρία fine dining που αποτελεί σημείο αναφοράς στην αθηναϊκή γαστρονομία.',
        cuisine: 'Γαλλο-μεσογειακή', neighborhood: 'Παγκράτι', city: 'athens',
        price_range: '€€€€', address: 'Πύρρωνος 5, 116 38',
        website: 'https://spondi.gr', instagram: '@spondirestaurant',
        is_new: false, editorial_score: 9.5,
        gradient_from: '#2c3e50', gradient_to: '#4ca1af', publishedAt: now
      }}),
      strapi.db.query('api::restaurant.restaurant').create({ data: {
        name: 'ΕΡΓΟΝ Αγορά', slug: 'ergon-agora',
        synopsis: 'Ελληνικά προϊόντα σε αγορά-εστιατόριο concept. Φρέσκα υλικά από παραγωγούς σε όλη την Ελλάδα, μαγειρεμένα μπροστά σας. Ιδανικό για brunch και μεσημεριανό.',
        cuisine: 'Ελληνική', neighborhood: 'Σύνταγμα', city: 'athens',
        price_range: '€€', address: 'Μητροπόλεως 23, 105 57',
        website: 'https://ergonfoods.com', instagram: '@ergonfoods',
        opening_date: '2025-02-01', is_new: true, editorial_score: 8.2,
        gradient_from: '#56ab2f', gradient_to: '#a8e063', publishedAt: now
      }}),
      strapi.db.query('api::restaurant.restaurant').create({ data: {
        name: 'Αμα Λαχεί', slug: 'ama-lachei',
        synopsis: 'Αυθεντικό μεζεδοπωλείο στου Ψυρρή με παραδοσιακούς μεζέδες και εκλεκτά ούζα. Ζωντανή μουσική τα βράδια του Σαββατοκύριακου.',
        cuisine: 'Ελληνική - Μεζεδοπωλείο', neighborhood: 'Ψυρρή', city: 'athens',
        price_range: '€€', address: 'Σοφοκλέους 69, 105 52',
        instagram: '@amalaxei_psiri',
        is_new: false,
        gradient_from: '#f7971e', gradient_to: '#ffd200', publishedAt: now
      }}),
      strapi.db.query('api::restaurant.restaurant').create({ data: {
        name: 'Funky Gourmet', slug: 'funky-gourmet',
        synopsis: 'Μοριακή γαστρονομία 2 αστέρων Michelin. Πολυαισθητηριακή εμπειρία σε ένα βιομηχανικό χώρο στον Κεραμεικό, με tasting menu που εκπλήσσει.',
        cuisine: 'Μοριακή Γαστρονομία', neighborhood: 'Κεραμεικός', city: 'athens',
        price_range: '€€€€', address: 'Παραμυθίας 13, 105 54',
        website: 'https://funkygourmet.com', instagram: '@funkygourmet',
        opening_date: '2025-03-01', is_new: true, editorial_score: 9.2,
        gradient_from: '#e44d26', gradient_to: '#f16529', publishedAt: now
      }}),
      strapi.db.query('api::restaurant.restaurant').create({ data: {
        name: 'Κουζίνα 42', slug: 'kouzina-42',
        synopsis: 'Σύγχρονη ελληνική κουζίνα σε ένα ανακαινισμένο νεοκλασικό στο Κολωνάκι. Seasonal menu με τοπικά προϊόντα και δημιουργική προσέγγιση.',
        cuisine: 'Νεοελληνική', neighborhood: 'Κολωνάκι', city: 'athens',
        price_range: '€€€', address: 'Σκουφά 42, 106 73',
        instagram: '@kouzina42',
        opening_date: '2025-03-15', is_new: true, editorial_score: 8.7,
        gradient_from: '#834d9b', gradient_to: '#d04ed6', publishedAt: now
      }}),
      strapi.db.query('api::restaurant.restaurant').create({ data: {
        name: 'Extravaganza', slug: 'extravaganza-thess',
        synopsis: 'Δημιουργική μεσογειακή κουζίνα στη Θεσσαλονίκη. Θέα στο Θερμαϊκό, κοκτέιλ bar και εντυπωσιακό menu που αντλεί έμπνευση από τη Μεσόγειο.',
        cuisine: 'Μεσογειακή', neighborhood: 'Λιμάνι', city: 'thessaloniki',
        price_range: '€€€', address: 'Λεωφ. Νίκης 21, 546 24',
        is_new: true, editorial_score: 8.5,
        gradient_from: '#1e3c72', gradient_to: '#2a5298', publishedAt: now
      }}),
    ]);

    strapi.log.info('✅ Restaurants seeded');

    // ─── Showtimes (future dates) ───
    const futureDate = (daysAhead, hour) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysAhead);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };

    await Promise.all([
      // Movie showtimes
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(1, 19), available_seats: 45, price: 9, movie: movies[0].id, venue: venues[2].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(1, 21), available_seats: 32, price: 9, movie: movies[1].id, venue: venues[2].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(2, 17), available_seats: 80, price: 8, movie: movies[2].id, venue: venues[3].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(2, 20), available_seats: 60, price: 10, movie: movies[3].id, venue: venues[2].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(3, 18), available_seats: 50, price: 9, movie: movies[4].id, venue: venues[2].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(3, 21), available_seats: 38, price: 9, movie: movies[5].id, venue: venues[3].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(4, 19), available_seats: 42, price: 11, movie: movies[6].id, venue: venues[2].id, publishedAt: now } }),
      // Theater showtimes
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(2, 20), available_seats: 55, price: 18, theater_show: shows[0].id, venue: venues[0].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(3, 21), available_seats: 120, price: 25, theater_show: shows[1].id, venue: venues[4].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(4, 19), available_seats: 90, price: 22, theater_show: shows[2].id, venue: venues[1].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(5, 20), available_seats: 150, price: 30, theater_show: shows[3].id, venue: venues[5].id, publishedAt: now } }),
      strapi.db.query('api::showtime.showtime').create({ data: { datetime: futureDate(2, 21), available_seats: 65, price: 15, theater_show: shows[4].id, venue: venues[0].id, publishedAt: now } }),
    ]);

    strapi.log.info('✅ Showtimes seeded');

    // ─── Editorial Reviews ───
    await Promise.all([
      strapi.db.query('api::editorial-review.editorial-review').create({ data: {
        title: 'Ένα Αριστούργημα Παραλογίας', slug: 'poor-things-masterwork',
        body: 'Ο Γιώργος Λάνθιμος παραδίδει την πιο ανατρεπτική, εφευρετική και ελευθεριακή ταινία του. Η Έμα Στόουν είναι εξαιρετική σε έναν ρόλο που απαιτεί ανδρεία. Μια ταινία που αψηφά τις συμβάσεις και ανταμείβει τον θεατή με εικόνες που μένουν.',
        score: 9.1, author: 'Ελένη Παπαδάκη', category: 'movie',
        movie: movies[1].id, published_at: now, publishedAt: now
      }}),
      strapi.db.query('api::editorial-review.editorial-review').create({ data: {
        title: 'Το Sci-Fi Ξαναορίζεται', slug: 'dune-2-sci-fi',
        body: 'Το όραμα του Βιλνέβ για το Αρρακίς ξαναορίζει τα δεδομένα του είδους. Εντυπωσιακή φωτογραφία, υπνωτική μουσική και ερμηνείες που αγγίζουν το μεγαλείο. Σπάνια μια sequel ξεπερνά το πρωτότυπο — εδώ συμβαίνει ακριβώς αυτό.',
        score: 9.4, author: 'Νίκος Αλεξάνδρου', category: 'movie',
        movie: movies[2].id, published_at: now, publishedAt: now
      }}),
      strapi.db.query('api::editorial-review.editorial-review').create({ data: {
        title: 'Μια Ηλεκτρική Βραδιά στο Εθνικό', slug: 'mideia-national',
        body: 'Η Μαρία Ναυπλιώτου δίνει ερμηνεία σταθμό ως Μήδεια. Ο Λιβαθινός οδηγεί τη σκηνοθεσία με σιγουριά — η σκηνή της εκδίκησης σε παγώνει. Θέατρο στο ύψιστο επίπεδό του.',
        score: 8.7, author: 'Σοφία Γεωργίου', category: 'theater',
        theater_show: shows[0].id, published_at: now, publishedAt: now
      }}),
      strapi.db.query('api::editorial-review.editorial-review').create({ data: {
        title: 'Nolan: Η Αθήνα Συναντά το Τόκιο', slug: 'nolan-review',
        body: 'Εκπληκτική fusion εμπειρία που μπλέκει αρμονικά ελληνικές πρώτες ύλες με ιαπωνικές τεχνικές. Το omakase menu είναι ένα ταξίδι αισθήσεων. Από τα πιο συναρπαστικά εστιατόρια που έχουν ανοίξει φέτος.',
        score: 9.0, author: 'Μαρία Κοντοπούλου', category: 'restaurant',
        restaurant: restaurants[0].id, published_at: now, publishedAt: now
      }}),
      strapi.db.query('api::editorial-review.editorial-review').create({ data: {
        title: 'Η Σιωπή που Αφηγείται', slug: 'zone-of-interest-review',
        body: 'Ο Γκλέιζερ δημιουργεί μια ταινία-σοκ χωρίς να δείξει σχεδόν τίποτα. Η φρίκη κρύβεται πίσω από τον τοίχο, στους ήχους και στις σιωπές. Κινηματογράφος στην πιο αυστηρή του μορφή.',
        score: 9.0, author: 'Κώστας Δημητρίου', category: 'movie',
        movie: movies[5].id, published_at: now, publishedAt: now
      }}),
      strapi.db.query('api::editorial-review.editorial-review').create({ data: {
        title: 'Fine Dining στα Καλύτερά του', slug: 'spondi-review',
        body: 'Το Spondi παραμένει ακλόνητο στην κορυφή. Κάθε πιάτο είναι ένα μικρό έργο τέχνης, η εξυπηρέτηση αψεγάδιαστη. Η αυλή τα καλοκαιρινά βράδια είναι μαγική.',
        score: 9.5, author: 'Ελένη Παπαδάκη', category: 'restaurant',
        restaurant: restaurants[1].id, published_at: now, publishedAt: now
      }}),
    ]);

    strapi.log.info('✅ Editorial Reviews seeded');

    // ─── User Reviews ───
    await Promise.all([
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Γιώργος Μ.', content_type: 'movie', rating: 4.5, body: 'Εξαιρετική ταινία! Ο Λάνθιμος στα καλύτερά του. Η Έμα Στόουν αξίζει κάθε βραβείο.', movie: movies[1].id, publishedAt: now } }),
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Μαρία Π.', content_type: 'theater', rating: 5.0, body: 'Η Ναυπλιώτου ήταν συγκλονιστική. Δάκρυσα στο τέλος. Must-see!', theater_show: shows[0].id, publishedAt: now } }),
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Δημήτρης Κ.', content_type: 'movie', rating: 5.0, body: 'Ίσως η καλύτερη ταινία επιστημονικής φαντασίας ever. Η φωτογραφία κόβει την ανάσα.', movie: movies[2].id, publishedAt: now } }),
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Κατερίνα Λ.', content_type: 'restaurant', rating: 4.0, body: 'Υπέροχο fusion φαγητό, λίγο ακριβό αλλά αξίζει. Το unagi nigiri ήταν αξέχαστο.', restaurant: restaurants[0].id, publishedAt: now } }),
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Αλέξανδρος Ν.', content_type: 'theater', rating: 4.5, body: 'Φανταστικό μιούζικαλ! Η Βανδή εκπληκτική. Ο ήχος θα μπορούσε να ήταν λίγο καλύτερος.', theater_show: shows[1].id, publishedAt: now } }),
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Σοφία Α.', content_type: 'restaurant', rating: 5.0, body: 'Μαγευτική εμπειρία! Κάθε πιάτο ήταν ένα μικρό αριστούργημα. Η αυλή το βράδυ είναι ρομαντική.', restaurant: restaurants[1].id, publishedAt: now } }),
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Νίκος Β.', content_type: 'movie', rating: 4.0, body: 'Πολύ καλή ταινία αλλά λίγο αργή σε σημεία. Η ερμηνεία του Τζιαμάτι σε κρατά.', movie: movies[4].id, publishedAt: now } }),
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Ειρήνη Δ.', content_type: 'restaurant', rating: 4.5, body: 'Τέλεια για brunch! Φρέσκα υλικά, ωραίος χώρος. Θα ξαναπάω σίγουρα.', restaurant: restaurants[2].id, publishedAt: now } }),
      strapi.db.query('api::user-review.user-review').create({ data: { user_name: 'Πέτρος Γ.', content_type: 'movie', rating: 4.5, body: 'Συγκλονιστική. Σε κάνει να σκέφτεσαι μέρες μετά. Αυστηρό αλλά αναγκαίο σινεμά.', movie: movies[5].id, publishedAt: now } }),
    ]);

    strapi.log.info('✅ User Reviews seeded');
    strapi.log.info('🎉 WhatSON Athens seed completed! Total: %d movies, %d shows, %d restaurants, %d venues',
      movies.length, shows.length, restaurants.length, venues.length);
  },
};
