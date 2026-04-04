import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EventCard from "@/components/EventCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { getTheaterShows } from "@/lib/strapi";

const GENRES = ["All", "drama", "comedy", "musical", "dance", "opera"];

const TheaterPage = () => {
  const [selectedGenre, setSelectedGenre] = useState("All");

  const { data: shows = [], isLoading } = useQuery({
    queryKey: ["theater-shows"],
    queryFn: getTheaterShows,
  });

  const filtered = selectedGenre === "All"
    ? shows
    : shows.filter((s) => s.genre === selectedGenre);

  return (
    <div className="min-h-screen pt-20 pb-20 md:pb-8">
      <div className="container py-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Theater</h1>
        <p className="text-muted-foreground mb-8">Performances, musicals & dance across Greece</p>

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
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((show) => (
                <EventCard
                  key={show.id}
                  slug={show.slug}
                  title={show.title}
                  subtitle={show.director}
                  genre={show.genre}
                  duration={show.duration}
                  gradientFrom={show.gradient_from || "#2c3e50"}
                  gradientTo={show.gradient_to || "#8e44ad"}
                  type="theater"
                />
              ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No shows found for this genre.
          </div>
        )}
      </div>
    </div>
  );
};

export default TheaterPage;
