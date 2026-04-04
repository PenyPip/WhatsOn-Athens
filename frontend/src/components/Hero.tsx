import { Link } from "react-router-dom";
import { Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { movies } from "@/data/mockData";

const Hero = () => {
  const featured = movies[2]; // Dune

  return (
    <section className="relative h-[80vh] min-h-[500px] overflow-hidden">
      {/* Ambient Background */}
      <div
        className="absolute inset-0 scale-110 blur-3xl opacity-40"
        style={{ background: `linear-gradient(135deg, ${featured.gradientFrom}, ${featured.gradientTo})` }}
      />
      <div className="absolute inset-0 gradient-hero-overlay" />

      {/* Content */}
      <div className="relative z-10 container h-full flex items-end pb-16 md:pb-20">
        <div className="max-w-2xl animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
              Featured
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-semibold">{featured.criticScore}</span>
            </div>
            <span className="text-sm text-muted-foreground">{featured.genre} · {featured.duration} min</span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 leading-tight">
            {featured.title}
          </h1>

          <p className="text-muted-foreground text-base md:text-lg mb-6 leading-relaxed max-w-lg">
            {featured.synopsis}
          </p>

          <div className="flex items-center gap-4">
            <Link to={`/movies/${featured.slug}`}>
              <Button className="gap-2 font-semibold px-6">
                Book Tickets
              </Button>
            </Link>
            <Button variant="outline" className="gap-2 border-[var(--glass-border)] bg-transparent hover:bg-secondary">
              <Play className="w-4 h-4" />
              Trailer
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Dir. {featured.director} · {featured.cast.slice(0, 3).join(", ")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
