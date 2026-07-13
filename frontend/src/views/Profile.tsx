import { useState, useMemo } from "react";
import { Heart, Star, User, LogOut, Eye } from "lucide-react";
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
import { userHasReviewedContent } from "@/lib/seenContent";
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

  const seenWithoutReview = useMemo(() => {
    const reviews = myReviews ?? [];
    const movies = (profile?.seenMovies ?? [])
      .filter((m) => !userHasReviewedContent(reviews, { contentType: "movie", movieId: m.id }))
      .map((m) => ({ kind: "movie" as const, id: m.id, slug: m.slug, title: m.title, posterUrl: m.posterUrl }));
    const shows = (profile?.seenTheaterShows ?? [])
      .filter(
        (s) => !userHasReviewedContent(reviews, { contentType: "theater", theaterShowId: s.id }),
      )
      .map((s) => ({ kind: "theater" as const, id: s.id, slug: s.slug, title: s.title, posterUrl: s.posterUrl }));
    return [...movies, ...shows];
  }, [profile?.seenMovies, profile?.seenTheaterShows, myReviews]);

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
              Αποθήκευσε αγαπημένες ταινίες, σημείωσε τι είδες και γράψε κριτικές.
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

        {seenWithoutReview.length > 0 ? (
          <section className="rounded-xl border border-amber-300/45 bg-amber-50/80 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-lg font-semibold">Βαθμολόγησέ τα</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Τα είδες αλλά δεν έχεις γράψει ακόμα κριτική — η γνώμη σου μετράει.
            </p>
            <ul className="space-y-2">
              {seenWithoutReview.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    to={`/${item.kind === "movie" ? "movies" : "theater"}/${item.slug}#write-review`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/60 bg-white px-4 py-3 text-sm font-medium transition-colors hover:border-amber-300"
                  >
                    <span>{item.title}</span>
                    <span className="shrink-0 text-amber-700">Γράψε κριτική →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-sky-600" />
            <h2 className="font-display text-lg font-semibold">Έχω δει</h2>
          </div>
          {(profile?.seenMovies ?? []).length === 0 && (profile?.seenTheaterShows ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Σημείωσε «Το είδα» σε ταινία ή παράσταση από τη σελίδα της.
            </p>
          ) : (
            <div className="space-y-6">
              {(profile?.seenMovies ?? []).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {(profile?.seenMovies ?? []).map((movie) => {
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
                        seen
                      />
                    );
                  })}
                </div>
              ) : null}
              {(profile?.seenTheaterShows ?? []).length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {(profile?.seenTheaterShows ?? []).map((show) => (
                    <li key={show.id}>
                      <Link
                        to={`/theater/${show.slug}`}
                        className="card-elevated flex items-center gap-3 p-4 hover:border-sky-400/30 transition-colors"
                      >
                        {show.posterUrl ? (
                          <img
                            src={show.posterUrl}
                            alt=""
                            className="h-14 w-20 shrink-0 rounded object-cover"
                          />
                        ) : null}
                        <span className="font-medium">{show.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
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
