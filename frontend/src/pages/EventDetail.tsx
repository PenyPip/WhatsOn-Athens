import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Clock, Globe, Users, ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import BookingModal from "@/components/BookingModal";
import {
  getMovie, getTheaterShow,
  getMovies, getTheaterShows,
  getReviewsForMovie, getReviewsForShow,
  getShowtimesForMovie, getShowtimesForShow,
} from "@/lib/strapi";

const EventDetail = ({ type }: { type: "movie" | "theater" }) => {
  const { slug } = useParams();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedShowtime, setSelectedShowtime] = useState<number | null>(null);

  const isMovie = type === "movie";

  const { data: event, isLoading } = useQuery({
    queryKey: [type, slug],
    queryFn: () => isMovie ? getMovie(slug!) : getTheaterShow(slug!),
    enabled: !!slug,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", type, event?.id],
    queryFn: () => isMovie
      ? getReviewsForMovie(event!.id)
      : getReviewsForShow(event!.id),
    enabled: !!event?.id,
  });

  const { data: showtimes = [] } = useQuery({
    queryKey: ["showtimes", type, event?.id],
    queryFn: () => isMovie
      ? getShowtimesForMovie(event!.id)
      : getShowtimesForShow(event!.id),
    enabled: !!event?.id,
  });

  const { data: relatedMovies = [] } = useQuery({
    queryKey: ["movies"],
    queryFn: getMovies,
    enabled: isMovie,
  });

  const { data: relatedShows = [] } = useQuery({
    queryKey: ["theater-shows"],
    queryFn: getTheaterShows,
    enabled: !isMovie,
  });

  const related = isMovie
    ? relatedMovies.filter((m) => m.slug !== slug).slice(0, 4)
    : relatedShows.filter((s) => s.slug !== slug).slice(0, 4);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-2">Not Found</h1>
          <Link to="/" className="text-primary text-sm">Go home</Link>
        </div>
      </div>
    );
  }

  const gFrom = (event as any).gradient_from || "#1a1a2e";
  const gTo = (event as any).gradient_to || "#e94560";
  const criticScore = (event as any).critic_score;
  const ageRating = (event as any).age_rating;
  const language = (event as any).language;
  const venue = (event as any).venue;
  const cast: string[] = (event as any).cast || [];
  const posterUrl = (event as any).poster?.url || null;

  const avgScore = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 scale-110 blur-3xl opacity-50"
          style={{
            background: posterUrl
              ? `url(${posterUrl}) center/cover`
              : `linear-gradient(135deg, ${gFrom}, ${gTo})`
          }}
        />
        <div className="absolute inset-0 gradient-hero-overlay" />

        <div className="relative z-10 container h-full flex items-end pb-12">
          <div className="flex gap-6 items-end max-w-3xl animate-fade-up">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={event.title}
                className="hidden md:block w-48 h-72 rounded-lg flex-shrink-0 shadow-2xl object-cover"
              />
            ) : (
              <div
                className="hidden md:block w-48 h-72 rounded-lg flex-shrink-0 shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}
              />
            )}
            <div>
              <Link
                to={isMovie ? "/movies" : "/theater"}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <ArrowLeft className="w-3 h-3" /> Back to {isMovie ? "Movies" : "Theater"}
              </Link>

              <div className="flex items-center gap-2 mb-3">
                {criticScore && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <span className="text-xs font-semibold text-primary">{criticScore}</span>
                  </div>
                )}
                {ageRating && <span className="text-xs text-muted-foreground">{ageRating}</span>}
              </div>

              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">{event.title}</h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {event.duration} min</span>
                <span className="capitalize">{event.genre}</span>
                {language && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {language}</span>}
                {venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {venue.name}</span>}
              </div>

              <Button onClick={() => setBookingOpen(true)} className="font-semibold px-6">
                Book Tickets
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-10 space-y-12">
        {/* Synopsis + Details */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h2 className="font-display text-xl font-semibold">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed">{(event as any).synopsis}</p>
          </div>
          <div className="glass-card rounded-lg p-5 space-y-3 h-fit">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Director</p>
              <p className="text-sm font-medium">{event.director}</p>
            </div>
            {cast.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cast</p>
                <p className="text-sm">{cast.join(", ")}</p>
              </div>
            )}
            {(event as any).release_date && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Release</p>
                <p className="text-sm">{new Date((event as any).release_date).toLocaleDateString('el-GR')}</p>
              </div>
            )}
            {(event as any).tags && (
              <div className="flex flex-wrap gap-1">
                {((event as any).tags as string[]).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Showtimes */}
        {showtimes.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Showtimes</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {showtimes.map((st) => (
                <button
                  key={st.id}
                  onClick={() => { setSelectedShowtime(st.id); setBookingOpen(true); }}
                  className={`glass-card rounded-lg p-4 text-left transition-all glass-card-hover ${selectedShowtime === st.id ? "border-primary" : ""}`}
                >
                  <p className="font-semibold text-sm">
                    {new Date(st.datetime).toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <p className="text-primary font-bold text-lg">
                    {new Date(st.datetime).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {st.venue && <p className="text-xs text-muted-foreground mt-1">{st.venue.name}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{st.available_seats} seats left</span>
                    <span className="text-sm font-semibold text-primary">€{st.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-xl font-semibold">Reviews</h2>
              {avgScore && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span className="text-sm font-bold text-primary">{avgScore}</span>
                </div>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <div key={review.id} className="glass-card rounded-lg p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm leading-tight">{review.title}</h3>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <Star className="w-3 h-3 text-primary fill-primary" />
                      <span className="text-xs font-bold text-primary">{review.score}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">{review.body}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{review.author}</span>
                    {review.is_editorial && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Editorial</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">You might also like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map((item: any) => (
                <EventCard
                  key={item.id}
                  slug={item.slug}
                  title={item.title}
                  subtitle={item.director}
                  genre={item.genre}
                  duration={item.duration}
                  score={item.critic_score}
                  gradientFrom={item.gradient_from || "#1a1a2e"}
                  gradientTo={item.gradient_to || "#e94560"}
                  type={type}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        eventTitle={event.title}
        showtimes={showtimes}
        preselectedShowtimeId={selectedShowtime}
      />
    </div>
  );
};

export default EventDetail;