export interface Movie {
  id: string;
  slug: string;
  title: string;
  director: string;
  cast: string[];
  genre: string;
  duration: number;
  language: string;
  ageRating: string;
  synopsis: string;
  criticScore: number;
  releaseDate: string;
  trailerUrl?: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface TheaterShow {
  id: string;
  slug: string;
  title: string;
  director: string;
  cast: string[];
  genre: string;
  duration: number;
  venue: string;
  synopsis: string;
  tags: string[];
  gradientFrom: string;
  gradientTo: string;
  isPremiere?: boolean;
  isLastShows?: boolean;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  synopsis: string;
  cuisine: string;
  neighborhood: string;
  city: string;
  priceRange: string;
  address: string;
  phone?: string;
  website?: string;
  instagram?: string;
  openingDate: string;
  isNew: boolean;
  gradientFrom: string;
  gradientTo: string;
  editorialScore?: number;
  editorialReview?: string;
  editorialAuthor?: string;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: "Αθήνα" | "Θεσσαλονίκη" | "Άλλο";
  googleMapsUrl: string;
  seatsTotal: number;
  type: string;
}

export interface EditorialReview {
  id: string;
  slug: string;
  title: string;
  body: string;
  score?: number;
  author: string;
  authorImageUrl?: string;
  category: "movie" | "theater" | "restaurant";
  contentTitle: string;
  featuredImageGradientFrom?: string;
  featuredImageGradientTo?: string;
  publishedAt: string;
}

export interface UserReview {
  id: string;
  userName: string;
  rating: number;
  body: string;
  contentType: string;
  contentTitle: string;
  createdAt: string;
}

export interface Showtime {
  id: string;
  datetime: string;
  venue: string;
  availableSeats: number;
  price: number;
}

export const movies: Movie[] = [
  {
    id: "1", slug: "o-melissokomos", title: "Ο Μελισσοκόμος", director: "Θόδωρος Αγγελόπουλος",
    cast: ["Μαρτσέλο Μαστρογιάνι", "Νάντια Μουρούζη", "Σεργιάνης Κυργιάκος"],
    genre: "Δράμα", duration: 122, language: "Ελληνικά", ageRating: "16+",
    synopsis: "Ένας συνταξιούχος δάσκαλος εγκαταλείπει την οικογένειά του για να ακολουθήσει τις μέλισσες σε ένα ταξίδι μέσα από την Ελλάδα.",
    criticScore: 8.9, releaseDate: "2024-01-15",
    gradientFrom: "#f0c27f", gradientTo: "#4b1248"
  },
  {
    id: "2", slug: "poor-things", title: "Poor Things", director: "Γιώργος Λάνθιμος",
    cast: ["Έμα Στόουν", "Μαρκ Ράφαλο", "Γουίλεμ Νταφόε"],
    genre: "Δράμα", duration: 141, language: "Αγγλικά", ageRating: "18+",
    synopsis: "Η απίστευτη ιστορία της Μπέλα Μπάξτερ, μιας νεαρής γυναίκας που επαναφέρεται στη ζωή από τον εκκεντρικό επιστήμονα Δρ. Γκόντγουιν Μπάξτερ.",
    criticScore: 9.1, releaseDate: "2023-12-08",
    gradientFrom: "#667eea", gradientTo: "#764ba2"
  },
  {
    id: "3", slug: "dune-meros-dyo", title: "Dune: Μέρος Δύο", director: "Ντενί Βιλνέβ",
    cast: ["Τιμοτέ Σαλαμέ", "Ζεντάγια", "Όστιν Μπάτλερ"],
    genre: "Επιστημονική Φαντασία", duration: 166, language: "Αγγλικά", ageRating: "13+",
    synopsis: "Ο Πολ Ατρέιντις ενώνεται με τους Φρίμεν ενώ ετοιμάζεται για εκδίκηση εναντίον αυτών που κατέστρεψαν την οικογένειά του.",
    criticScore: 9.4, releaseDate: "2024-03-01",
    gradientFrom: "#f5af19", gradientTo: "#f12711"
  },
  {
    id: "4", slug: "anatomia-mias-ptosis", title: "Ανατομία μιας Πτώσης", director: "Ζιστίν Τριέ",
    cast: ["Σάντρα Χίλερ", "Σουόν Αρλό", "Μίλο Ματσάντο Γκρανέρ"],
    genre: "Θρίλερ", duration: 152, language: "Γαλλικά", ageRating: "16+",
    synopsis: "Μια γυναίκα υποψιάζεται για τη δολοφονία του συζύγου της και ο τυφλός γιος τους αντιμετωπίζει ένα ηθικό δίλημμα ως ο μοναδικός μάρτυρας.",
    criticScore: 8.8, releaseDate: "2024-01-26",
    gradientFrom: "#bdc3c7", gradientTo: "#2c3e50"
  },
  {
    id: "5", slug: "oi-apomeinantes", title: "Οι Απομείναντες", director: "Αλεξάντερ Πέιν",
    cast: ["Πολ Τζιαμάτι", "Ντα'Βάιν Τζόι Ράντολφ", "Ντόμινικ Σέσα"],
    genre: "Κωμωδία", duration: 133, language: "Αγγλικά", ageRating: "13+",
    synopsis: "Ένας γκρινιάρης καθηγητής σε ιδιωτικό σχολείο αναγκάζεται να μείνει στο campus κατά τη διάρκεια των Χριστουγέννων για να προσέχει τους λίγους μαθητές που δεν έχουν πού να πάνε.",
    criticScore: 8.5, releaseDate: "2024-01-19",
    gradientFrom: "#2193b0", gradientTo: "#6dd5ed"
  },
];

export const theaterShows: TheaterShow[] = [
  {
    id: "1", slug: "mideia", title: "Μήδεια", director: "Στάθης Λιβαθινός",
    cast: ["Μαρία Ναυπλιώτου", "Αργύρης Πανταζάρας"],
    genre: "Δράμα", duration: 150, venue: "Εθνικό Θέατρο",
    synopsis: "Η κλασική τραγωδία του Ευριπίδη σε μια σύγχρονη σκηνοθετική προσέγγιση που αναδεικνύει τη διαχρονικότητα του έργου.",
    tags: ["Δράμα", "Κλασικό", "Ελληνική Τραγωδία"],
    gradientFrom: "#c94b4b", gradientTo: "#4b134f",
    isPremiere: true
  },
  {
    id: "2", slug: "mamma-mia", title: "Mamma Mia!", director: "Φυλλίδα Λόιντ",
    cast: ["Δέσποινα Βανδή", "Νίκος Μουτσινάς"],
    genre: "Μιούζικαλ", duration: 155, venue: "Θέατρο Ακροπόλ",
    synopsis: "Το αγαπημένο μιούζικαλ με τα τραγούδια των ABBA σε μια λαμπερή παράσταση γεμάτη χορό και μουσική.",
    tags: ["Μιούζικαλ", "Κωμωδία", "Feel-Good"],
    gradientFrom: "#fc5c7d", gradientTo: "#6a82fb"
  },
  {
    id: "3", slug: "gyalini-menatzeri", title: "Η Γυάλινη Μενατζερί", director: "Δημήτρης Παπαϊωάννου",
    cast: ["Κατερίνα Ευαγγελάτου", "Γιάννης Στάνκογλου"],
    genre: "Δράμα", duration: 135, venue: "Ωδείο Ηρώδου Αττικού",
    synopsis: "Το αριστούργημα του Τένεσι Ουίλιαμς σε μια ατμοσφαιρική παραγωγή που εξερευνά τη φύση των ονείρων και της πραγματικότητας.",
    tags: ["Δράμα", "Κλασικό", "Αμερικανικό Θέατρο"],
    gradientFrom: "#11998e", gradientTo: "#38ef7d",
    isLastShows: true
  },
  {
    id: "4", slug: "limni-ton-kyknon", title: "Η Λίμνη των Κύκνων", director: "Μάθιου Μπορν",
    cast: ["Βασιλικό Μπαλέτο"],
    genre: "Χορός", duration: 140, venue: "Μέγαρο Μουσικής",
    synopsis: "Το κλασικό μπαλέτο του Τσαϊκόφσκι σε μια εκπληκτική παραγωγή με καινοτόμα χορογραφία.",
    tags: ["Χορός", "Μπαλέτο", "Κλασικό"],
    gradientFrom: "#0f2027", gradientTo: "#2c5364"
  },
];

export const restaurants: Restaurant[] = [
  {
    id: "1", slug: "nolan-athens",
    name: "Nolan", synopsis: "Ιαπωνο-ελληνική κουζίνα σε ένα κομψό περιβάλλον στο κέντρο της Αθήνας. Δημιουργικά πιάτα που συνδυάζουν ελληνικές πρώτες ύλες με ιαπωνικές τεχνικές.",
    cuisine: "Ιαπωνο-ελληνική", neighborhood: "Σύνταγμα", city: "Αθήνα",
    priceRange: "€€€", address: "Βουλής 31-33, Σύνταγμα",
    phone: "210 3244046", website: "https://nolan.gr", instagram: "@nolan_athens",
    openingDate: "2024-02-10", isNew: true,
    gradientFrom: "#1a1a2e", gradientTo: "#e94560",
    editorialScore: 9.0, editorialReview: "Η καλύτερη fusion κουζίνα στην Αθήνα αυτή τη στιγμή.", editorialAuthor: "Μαρία Κοντοπούλου"
  },
  {
    id: "2", slug: "spondi",
    name: "Spondi", synopsis: "Γαλλο-μεσογειακή κουζίνα βραβευμένη με δύο αστέρια Michelin σε ένα νεοκλασικό κτίριο με αυλή. Εξαιρετική λίστα κρασιών.",
    cuisine: "Γαλλο-μεσογειακή", neighborhood: "Παγκράτι", city: "Αθήνα",
    priceRange: "€€€€", address: "Πύρρωνος 5, Παγκράτι",
    phone: "210 7564021", website: "https://spondi.gr", instagram: "@spondirestaurant",
    openingDate: "2023-05-01", isNew: false,
    gradientFrom: "#2c3e50", gradientTo: "#4ca1af",
    editorialScore: 9.5, editorialReview: "Αδιαμφισβήτητα ένα από τα κορυφαία εστιατόρια της χώρας.", editorialAuthor: "Νίκος Αλεξάνδρου"
  },
  {
    id: "3", slug: "ergon-agora",
    name: "ΕΡΓΟΝ Αγορά", synopsis: "Ελληνικά προϊόντα και γεύσεις σε έναν χώρο αγοράς-εστιατορίου. Φρέσκα υλικά από μικρούς παραγωγούς.",
    cuisine: "Ελληνική", neighborhood: "Συνταγματάρχη", city: "Αθήνα",
    priceRange: "€€", address: "Μητροπόλεως 23, Σύνταγμα",
    openingDate: "2024-01-05", isNew: true,
    gradientFrom: "#56ab2f", gradientTo: "#a8e063",
    editorialScore: 8.2, editorialReview: "Η τέλεια γνωριμία με τα ελληνικά προϊόντα.", editorialAuthor: "Σοφία Γεωργίου"
  },
  {
    id: "4", slug: "ama-lachei",
    name: "Αμα Λαχεί", synopsis: "Μεζεδοπωλείο στου Ψυρρή με αυθεντική ατμόσφαιρα, ζωντανή μουσική και παραδοσιακούς μεζέδες.",
    cuisine: "Ελληνική - Μεζεδοπωλείο", neighborhood: "Ψυρρή", city: "Αθήνα",
    priceRange: "€€", address: "Σοφοκλέους 69, Ψυρρή",
    openingDate: "2023-09-15", isNew: false,
    gradientFrom: "#f7971e", gradientTo: "#ffd200"
  },
  {
    id: "5", slug: "funky-gourmet",
    name: "Funky Gourmet", synopsis: "Μοριακή γαστρονομία και δημιουργική κουζίνα σε ένα μοντέρνο σκηνικό στο Κεραμεικό. Δύο αστέρια Michelin.",
    cuisine: "Μοριακή Γαστρονομία", neighborhood: "Κεραμεικός", city: "Αθήνα",
    priceRange: "€€€€", address: "Παραμυθίας 13, Κεραμεικός",
    openingDate: "2024-03-01", isNew: true,
    gradientFrom: "#e44d26", gradientTo: "#f16529",
    editorialScore: 9.2, editorialReview: "Εμπειρία φαγητού που δεν θα ξεχάσετε.", editorialAuthor: "Μαρία Κοντοπούλου"
  },
];

export const editorialReviews: EditorialReview[] = [
  {
    id: "1", slug: "poor-things-masterwork",
    title: "Ένα Αριστούργημα Παραλογίας",
    body: "Ο Γιώργος Λάνθιμος παραδίδει την πιο προσβάσιμη και ταυτόχρονα πιο ανατρεπτική ταινία του. Η Έμα Στόουν είναι εκπληκτική σε έναν ρόλο που θα μείνει στην ιστορία.",
    score: 9.1, author: "Ελένη Παπαδάκη", category: "movie", contentTitle: "Poor Things",
    featuredImageGradientFrom: "#667eea", featuredImageGradientTo: "#764ba2",
    publishedAt: "2024-01-10"
  },
  {
    id: "2", slug: "dune-2-sci-fi-redefined",
    title: "Το Sci-Fi Ξαναορίζεται",
    body: "Το όραμα του Βιλνέβ για το Αρρακίς είναι τόσο τεράστιο και καθηλωτικό που ξαναορίζει τα δεδομένα στον κινηματογράφο.",
    score: 9.4, author: "Νίκος Αλεξάνδρου", category: "movie", contentTitle: "Dune: Μέρος Δύο",
    featuredImageGradientFrom: "#f5af19", featuredImageGradientTo: "#f12711",
    publishedAt: "2024-03-05"
  },
  {
    id: "3", slug: "mideia-national-theatre",
    title: "Μια Ηλεκτρική Βραδιά στο Εθνικό",
    body: "Αυτή η παραγωγή της Μήδειας αποσπά το αρχαίο κείμενο στον συναισθηματικό του πυρήνα, με τη Ναυπλιώτου να δίνει μια ερμηνεία σταθμό.",
    score: 8.7, author: "Σοφία Γεωργίου", category: "theater", contentTitle: "Μήδεια",
    featuredImageGradientFrom: "#c94b4b", featuredImageGradientTo: "#4b134f",
    publishedAt: "2024-02-15"
  },
  {
    id: "4", slug: "nolan-review",
    title: "Nolan: Η Αθήνα Συναντά το Τόκιο",
    body: "Μια εκπληκτική fusion εμπειρία που συνδυάζει ελληνικές πρώτες ύλες με ιαπωνικές τεχνικές. Κάθε πιάτο είναι ένα μικρό αριστούργημα.",
    score: 9.0, author: "Μαρία Κοντοπούλου", category: "restaurant", contentTitle: "Nolan",
    featuredImageGradientFrom: "#1a1a2e", featuredImageGradientTo: "#e94560",
    publishedAt: "2024-02-20"
  },
];

export const userReviews: UserReview[] = [
  { id: "1", userName: "Γιώργος Μ.", rating: 4.5, body: "Εξαιρετική ταινία, ο Λάνθιμος τα κάνει πάλι!", contentType: "movie", contentTitle: "Poor Things", createdAt: "2024-01-20" },
  { id: "2", userName: "Μαρία Π.", rating: 5.0, body: "Η Ναυπλιώτου ήταν συγκλονιστική. Μια παράσταση που πρέπει να δείτε.", contentType: "theater", contentTitle: "Μήδεια", createdAt: "2024-02-18" },
];

export const venues: Venue[] = [
  { id: "1", slug: "ethnikó-theatro", name: "Εθνικό Θέατρο", address: "Αγίου Κωνσταντίνου 22-24, Αθήνα", city: "Αθήνα", googleMapsUrl: "https://maps.google.com", seatsTotal: 800, type: "Θέατρο" },
  { id: "2", slug: "megaro-mousikis", name: "Μέγαρο Μουσικής", address: "Βασ. Σοφίας & Κοκκάλη, Αθήνα", city: "Αθήνα", googleMapsUrl: "https://maps.google.com", seatsTotal: 1900, type: "Μουσική Σκηνή" },
  { id: "3", slug: "theatro-akropol", name: "Θέατρο Ακροπόλ", address: "Ιπποκράτους 6, Αθήνα", city: "Αθήνα", googleMapsUrl: "https://maps.google.com", seatsTotal: 600, type: "Θέατρο" },
  { id: "4", slug: "village-cinemas", name: "Village Cinemas", address: "The Mall Athens, Μαρούσι", city: "Αθήνα", googleMapsUrl: "https://maps.google.com", seatsTotal: 2500, type: "Σινεμά" },
  { id: "5", slug: "olympion-thessaloniki", name: "Ολύμπιον", address: "Πλατεία Αριστοτέλους 10, Θεσσαλονίκη", city: "Θεσσαλονίκη", googleMapsUrl: "https://maps.google.com", seatsTotal: 400, type: "Σινεμά" },
];

export const showtimes: Showtime[] = [
  { id: "1", datetime: "2024-03-15T19:00", venue: "Village Cinemas", availableSeats: 45, price: 9 },
  { id: "2", datetime: "2024-03-15T21:30", venue: "Village Cinemas", availableSeats: 32, price: 9 },
  { id: "3", datetime: "2024-03-16T17:00", venue: "Ολύμπιον", availableSeats: 80, price: 8 },
  { id: "4", datetime: "2024-03-16T20:00", venue: "Εθνικό Θέατρο", availableSeats: 55, price: 15 },
  { id: "5", datetime: "2024-03-16T22:30", venue: "Μέγαρο Μουσικής", availableSeats: 120, price: 20 },
  { id: "6", datetime: "2024-03-17T18:00", venue: "Θέατρο Ακροπόλ", availableSeats: 28, price: 12 },
];
