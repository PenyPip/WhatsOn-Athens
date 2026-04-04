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
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: "Athens" | "Thessaloniki" | "Other";
  googleMapsUrl: string;
  seatsTotal: number;
}

export interface Review {
  id: string;
  title: string;
  body: string;
  score: number;
  author: string;
  isEditorial: boolean;
  eventTitle: string;
  eventType: "movie" | "theater";
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
    id: "1", slug: "the-beekeeper", title: "The Beekeeper", director: "David Ayer",
    cast: ["Jason Statham", "Emmy Raver-Lampman", "Josh Hutcherson"],
    genre: "Action", duration: 105, language: "English", ageRating: "18+",
    synopsis: "One man's brutal campaign for vengeance takes on national stakes after he is revealed to be a former operative of a powerful and clandestine organization known as Beekeepers.",
    criticScore: 7.2, releaseDate: "2024-01-12",
    gradientFrom: "#1a1a2e", gradientTo: "#e94560"
  },
  {
    id: "2", slug: "poor-things", title: "Poor Things", director: "Yorgos Lanthimos",
    cast: ["Emma Stone", "Mark Ruffalo", "Willem Dafoe"],
    genre: "Drama", duration: 141, language: "English", ageRating: "18+",
    synopsis: "The incredible tale about the fantastical evolution of Bella Baxter, a young woman brought back to life by the brilliant and unorthodox scientist Dr. Godwin Baxter.",
    criticScore: 9.1, releaseDate: "2023-12-08",
    gradientFrom: "#0f3460", gradientTo: "#16213e"
  },
  {
    id: "3", slug: "dune-part-two", title: "Dune: Part Two", director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Zendaya", "Austin Butler"],
    genre: "Sci-Fi", duration: 166, language: "English", ageRating: "13+",
    synopsis: "Paul Atreides unites with the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    criticScore: 9.4, releaseDate: "2024-03-01",
    gradientFrom: "#e8a020", gradientTo: "#1a1a2e"
  },
  {
    id: "4", slug: "anatomy-of-a-fall", title: "Anatomy of a Fall", director: "Justine Triet",
    cast: ["Sandra Hüller", "Swann Arlaud", "Milo Machado Graner"],
    genre: "Thriller", duration: 152, language: "French", ageRating: "16+",
    synopsis: "A woman is suspected of her husband's murder, and their blind son faces a moral dilemma as the sole witness.",
    criticScore: 8.8, releaseDate: "2024-01-26",
    gradientFrom: "#2d3436", gradientTo: "#636e72"
  },
  {
    id: "5", slug: "the-holdovers", title: "The Holdovers", director: "Alexander Payne",
    cast: ["Paul Giamatti", "Da'Vine Joy Randolph", "Dominic Sessa"],
    genre: "Comedy", duration: 133, language: "English", ageRating: "13+",
    synopsis: "A curmudgeonly instructor at a New England prep school is forced to remain on campus during Christmas break to babysit the handful of students with nowhere to go.",
    criticScore: 8.5, releaseDate: "2024-01-19",
    gradientFrom: "#0a3d62", gradientTo: "#3c6382"
  },
  {
    id: "6", slug: "all-of-us-strangers", title: "All of Us Strangers", director: "Andrew Haigh",
    cast: ["Andrew Scott", "Paul Mescal", "Jamie Bell"],
    genre: "Romance", duration: 105, language: "English", ageRating: "16+",
    synopsis: "A screenwriter who returns to his childhood home discovers that his parents, who died 30 years ago, are living there as if nothing happened.",
    criticScore: 8.9, releaseDate: "2024-02-02",
    gradientFrom: "#6c5ce7", gradientTo: "#a29bfe"
  },
];

export const theaterShows: TheaterShow[] = [
  {
    id: "1", slug: "medea-national-theatre", title: "Μήδεια", director: "Δημήτρης Λιγνάδης",
    cast: ["Μαρία Ναυπλιώτου", "Γιώργος Κιμούλης"],
    genre: "Drama", duration: 150, venue: "Εθνικό Θέατρο",
    synopsis: "Η κλασική τραγωδία του Ευριπίδη σε μια σύγχρονη σκηνοθετική προσέγγιση.",
    tags: ["Drama", "Classic", "Greek Tragedy"],
    gradientFrom: "#2c3e50", gradientTo: "#8e44ad"
  },
  {
    id: "2", slug: "mamma-mia", title: "Mamma Mia!", director: "Phyllida Lloyd",
    cast: ["Δέσποινα Βανδή", "Νίκος Μουτσινάς"],
    genre: "Musical", duration: 155, venue: "Θέατρο Ακροπόλ",
    synopsis: "Το αγαπημένο μιούζικαλ με τα τραγούδια των ABBA σε μια λαμπερή παράσταση.",
    tags: ["Musical", "Comedy", "Feel-Good"],
    gradientFrom: "#e74c3c", gradientTo: "#f39c12"
  },
  {
    id: "3", slug: "glass-menagerie", title: "The Glass Menagerie", director: "Sam Gold",
    cast: ["Isabella Rossellini", "Joe Mantello"],
    genre: "Drama", duration: 135, venue: "Ωδείο Ηρώδου Αττικού",
    synopsis: "Tennessee Williams' memory play exploring the fragile nature of dreams and reality.",
    tags: ["Drama", "Classic", "American Theater"],
    gradientFrom: "#1abc9c", gradientTo: "#2c3e50"
  },
  {
    id: "4", slug: "swan-lake", title: "Swan Lake", director: "Matthew Bourne",
    cast: ["Royal Ballet Company"],
    genre: "Dance", duration: 140, venue: "Μέγαρο Μουσικής",
    synopsis: "Tchaikovsky's timeless ballet reimagined with breathtaking choreography.",
    tags: ["Dance", "Ballet", "Classic"],
    gradientFrom: "#2c3e50", gradientTo: "#3498db"
  },
];

export const reviews: Review[] = [
  {
    id: "1", title: "A Masterwork of Absurdist Beauty", body: "Yorgos Lanthimos delivers his most accessible yet deeply subversive film to date. Emma Stone is transcendent.", score: 9.1, author: "Elena Papadaki", isEditorial: true, eventTitle: "Poor Things", eventType: "movie"
  },
  {
    id: "2", title: "Desert Epic Redefines Sci-Fi Cinema", body: "Villeneuve's vision of Arrakis is so vast and immersive that it redefines what blockbuster cinema can achieve.", score: 9.4, author: "Nikos Alexandros", isEditorial: true, eventTitle: "Dune: Part Two", eventType: "movie"
  },
  {
    id: "3", title: "A Haunting Night at the National Theatre", body: "This production of Medea strips the ancient text to its emotional core, with Nauplioti delivering a career-defining performance.", score: 8.7, author: "Sofia Georgiou", isEditorial: true, eventTitle: "Μήδεια", eventType: "theater"
  },
];

export const showtimes: Showtime[] = [
  { id: "1", datetime: "2024-03-15T19:00", venue: "Αίγλη Ζαππείου", availableSeats: 45, price: 9 },
  { id: "2", datetime: "2024-03-15T21:30", venue: "Αίγλη Ζαππείου", availableSeats: 32, price: 9 },
  { id: "3", datetime: "2024-03-16T17:00", venue: "Village Cinemas", availableSeats: 80, price: 11 },
  { id: "4", datetime: "2024-03-16T20:00", venue: "Village Cinemas", availableSeats: 55, price: 11 },
  { id: "5", datetime: "2024-03-16T22:30", venue: "Odeon Starcity", availableSeats: 120, price: 10 },
  { id: "6", datetime: "2024-03-17T18:00", venue: "Cine Paris", availableSeats: 28, price: 8 },
];
