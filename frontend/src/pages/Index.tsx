import { useQuery } from "@tanstack/react-query";
import Hero from "@/components/Hero";
import HorizontalScroll from "@/components/HorizontalScroll";
import EventCard from "@/components/EventCard";
import EditorialCard from "@/components/EditorialCard";
import CityFilter from "@/components/CityFilter";
import { SkeletonCard } from "@/components/SkeletonCard";
import RestaurantCard from "@/components/RestaurantCard";
import { getMovies, getTheaterShows, getEditorialReviews, getNewRestaurants } from "@/lib/strapi";

const Index = () => {
  const { data: movies = [], isLoading: moviesLoading } = useQuery({
    queryKey: ["movies"],
    queryFn: getMovies,
  });

  const { data: theaterShows = [], isLoading: showsLoading } = useQuery({
    queryKey: ["theater-shows"],
    queryFn: getTheaterShows,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["editorial-reviews"],
    queryFn: getEditorialReviews,
  });

  const { data: newRestaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ["new-restaurants"],
    queryFn: getNewRestaurants,
  });

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Hero />
      <div className="container">
        <CityFilter />
      </div>

      <HorizontalScroll title="Now Playing" subtitle="In cinemas across Athens">
        {moviesLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
                <SkeletonCard />
              </div>
            ))
          : movies.map((movie) => (
              <div key={movie.id} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
                <EventCard
                  slug={movie.slug}
                  title={movie.title}
                  subtitle={movie.director}
                  genre={movie.genre}
                  duration={movie.duration}
                  score={movie.critic_score}
                  gradientFrom={movie.gradient_from || "#1a1a2e"}
                  gradientTo={movie.gradient_to || "#e94560"}
                  type="movie"
                />
              </div>
            ))}
      </HorizontalScroll>

      <HorizontalScroll title="This Week on Stage" subtitle="Theater, dance & opera">
        {showsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
                <SkeletonCard />
              </div>
            ))
          : theaterShows.map((show) => (
              <div key={show.id} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
                <EventCard
                  slug={show.slug}
                  title={show.title}
                  subtitle={show.director}
                  genre={show.genre}
                  duration={show.duration}
                  gradientFrom={show.gradient_from || "#2c3e50"}
                  gradientTo={show.gradient_to || "#8e44ad"}
                  type="theater"
                />
              </div>
            ))}
      </HorizontalScroll>

      <HorizontalScroll title="New in Town" subtitle="Latest restaurant openings">
        {restaurantsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[200px] max-w-[200px] md:min-w-[240px] md:max-w-[240px] flex-shrink-0">
                <SkeletonCard />
              </div>
            ))
          : newRestaurants.map((r) => (
              <div key={r.id} className="min-w-[200px] max-w-[200px] md:min-w-[240px] md:max-w-[240px] flex-shrink-0">
                <RestaurantCard restaurant={r} />
              </div>
            ))}
      </HorizontalScroll>

      <section className="py-8">
        <div className="container">
          <h2 className="font-display text-2xl font-bold mb-2">Editorial Picks</h2>
          <p className="text-sm text-muted-foreground mb-6">Our critics' latest reviews</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviewsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-lg p-4 animate-pulse h-40" />
                ))
              : reviews.map((review) => (
                  <EditorialCard key={review.id} review={review} />
                ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--glass-border)] mt-12 py-8">
        <div className="container text-center">
          <span className="font-display text-lg font-bold text-gradient-gold">WhatSON</span>
          <span className="text-muted-foreground text-sm ml-2">Athens</span>
          <p className="text-xs text-muted-foreground mt-2">© 2024 WhatSON Athens. Your guide to entertainment in Greece.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;