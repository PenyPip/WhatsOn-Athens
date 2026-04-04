import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EventCard from "@/components/EventCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { getMovies } from "@/lib/strapi";

const GENRES = ["All", "action", "drama", "comedy", "thriller", "horror", "documentary", "romance", "sci-fi", "animation"];

const Movies = () => {
  const [selectedGenre, setSelectedGenre] = useState("All");

  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["movies"],
    queryFn: getMovies,
  });

  const filtered = selectedGenre === "All"
    ? movies
    : movies.filter((m) => m.genre === selectedGenre);

  return (
    <div className="min-h-screen pt-20 pb-20 md:pb-8">
      <div className="container py-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Movies</h1>
        <p className="text-muted-foreground mb-8">Now playing in Greek cinemas</p>

        {/* Genre filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedGenre === g
                  ? "bg-primary text-primary-foreground"
                  : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {g === "All" ? "All" : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((movie) => (
                <EventCard
                  key={movie.id}
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
              ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No movies found for this genre.
          </div>
        )}
      </div>
    </div>
  );
};

export default Movies;
