import { useState } from "react";
import { Heart, Star, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
import Footer from "@/components/Footer";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import { movieTitleLines } from "@/lib/movieTitles";
import { resolveImdbRating } from "@/lib/movieImdb";
import { deleteMyReview } from "@/lib/userProfile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyReviews } from "@/lib/userProfile";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";

const Profile = () => {
  usePageSeo(staticPageSeo.profile);
  const { user, profile, isAuthenticated, loading, login, register, logout } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { data: myReviews } = useQuery({
    queryKey: ["myReviews"],
    queryFn: fetchMyReviews,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const submitAuth = async () => {
    setError(null);
    setPending(true);
    try {
      if (mode === "login") {
        await login(identifier.trim(), password);
      } else {
        await register({
          username: username.trim(),
          email: email.trim(),
          password,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Αποτυχία σύνδεσης.");
    } finally {
      setPending(false);
    }
  };

  const removeReview = async (id: number) => {
    await deleteMyReview(id);
    await queryClient.invalidateQueries({ queryKey: ["myReviews"] });
    await queryClient.invalidateQueries({ queryKey: ["userReviews"] });
  };

  if (loading) {
    return (
      <div className={PAGE_LIST_SHELL_CLASS}>
        <PageListHeader>
          <h1 className={PAGE_LIST_TITLE_CLASS}>Προφίλ</h1>
        </PageListHeader>
        <div className="container max-w-2xl py-12 text-center text-muted-foreground">Φόρτωση...</div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={PAGE_LIST_SHELL_CLASS}>
        <PageListHeader>
          <h1 className={PAGE_LIST_TITLE_CLASS}>Προφίλ</h1>
        </PageListHeader>

        <div className="container max-w-md">
          <div className="card-elevated animate-fade-in-up p-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2 text-center">
              {mode === "login" ? "Σύνδεση" : "Εγγραφή"}
            </h2>
            <p className="text-muted-foreground text-sm mb-6 text-center">
              Αποθήκευσε αγαπημένες ταινίες και κινηματογράφους, γράψε κριτικές.
            </p>

            <div className="space-y-3">
              {mode === "register" ? (
                <>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Όνομα χρήστη"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    autoComplete="username"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    autoComplete="email"
                  />
                </>
              ) : (
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email ή όνομα χρήστη"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  autoComplete="username"
                />
              )}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Κωδικός"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

            <Button type="button" className="w-full mt-5" onClick={submitAuth} disabled={pending}>
              {pending ? "Περιμένετε..." : mode === "login" ? "Σύνδεση" : "Εγγραφή"}
            </Button>

            <button
              type="button"
              className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
            >
              {mode === "login" ? "Δεν έχεις λογαριασμό; Εγγραφή" : "Έχεις ήδη λογαριασμό; Σύνδεση"}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={PAGE_LIST_SHELL_CLASS}>
      <PageListHeader>
        <h1 className={PAGE_LIST_TITLE_CLASS}>Προφίλ</h1>
      </PageListHeader>

      <div className="container max-w-4xl space-y-8">
        <div className="card-elevated p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Συνδεδεμένος ως</p>
            <p className="font-display text-xl font-semibold">{profile?.displayName || user?.username}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Αποσύνδεση
          </Button>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="font-display text-lg font-semibold">Αγαπημένες ταινίες</h2>
          </div>
          {(profile?.favoriteMovies ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Δεν έχεις αποθηκεύσει ταινίες ακόμα.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(profile?.favoriteMovies ?? []).map((movie) => {
                const tl = movieTitleLines(movie);
                return (
                  <EventCard
                    key={movie.id}
                    slug={movie.slug}
                    title={tl.primary}
                    titleSecondary={tl.secondary}
                    subtitle=""
                    genre=""
                    duration={0}
                    imdbRating={movie.imdbRating ?? undefined}
                    posterUrl={movie.posterUrl ?? undefined}
                    isDubbed={movie.isDubbed}
                    type="movie"
                  />
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="font-display text-lg font-semibold">Αγαπημένοι κινηματογράφοι</h2>
          </div>
          {(profile?.favoriteVenues ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Δεν έχεις αποθηκεύσει κινηματογράφους ακόμα.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {(profile?.favoriteVenues ?? []).map((venue) => (
                <li key={venue.id}>
                  <Link
                    to={moviesVenueProgramPath(venue.slug)}
                    className="card-elevated block p-4 hover:border-primary/30 transition-colors"
                  >
                    <p className="font-medium">{venue.name}</p>
                    {venue.city ? <p className="text-xs text-muted-foreground mt-1">{venue.city}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-lg font-semibold">Οι κριτικές μου</h2>
          </div>
          {(myReviews ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Δεν έχεις γράψει κριτικές ακόμα.</p>
          ) : (
            <div className="space-y-3">
              {(myReviews ?? []).map((review) => (
                <div key={review.id} className="card-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{review.contentTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">{review.rating}/5 ★</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeReview(review.id)}>
                      Διαγραφή
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{review.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
