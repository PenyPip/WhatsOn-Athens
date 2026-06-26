import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { MapPin, Phone, Globe, Instagram, ArrowLeft, UtensilsCrossed } from "lucide-react";
import { useRestaurants } from "@/hooks/useStrapi";
import RestaurantCard from "@/components/RestaurantCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { truncateDescription } from "@/lib/siteMetadata";
import RestaurantLocationMap from "@/components/RestaurantLocationMap";
import {
  restaurantAreaLine,
  restaurantInstagramHref,
  restaurantInstagramLabel,
  restaurantMapsHref,
  restaurantWebsiteHref,
} from "@/lib/restaurantLinks";
import { cn } from "@/lib/utils";
import { PAGE_BELOW_NAV_CLASS, PAGE_DETAIL_HERO_INNER_CLASS } from "@/components/PageListHeader";

const DiningDetail = () => {
  const { slug } = useParams();
  const { data: restaurants, isLoading } = useRestaurants();

  const restaurant = restaurants?.find((r) => r.slug === slug);

  usePageSeo(
    useMemo(() => {
      if (isLoading) return { title: "Εστιατόριο", enabled: false };
      if (!restaurant) {
        return { ...staticPageSeo.notFound, path: slug ? `/dining/${slug}` : "/dining" };
      }
      const place = restaurantAreaLine(restaurant);
      return {
        title: restaurant.name,
        description: truncateDescription(
          (restaurant.synopsis ?? "").trim() ||
            `${restaurant.name} — ${[restaurant.category, restaurant.cuisine].filter(Boolean).join(" · ")}${place ? `, ${place}` : ""}.`,
        ),
        path: `/dining/${restaurant.slug}`,
        image: restaurant.posterUrl,
        imageAlt: restaurant.name,
      };
    }, [isLoading, restaurant, slug]),
  );

  if (isLoading) {
    return (
      <div className={PAGE_BELOW_NAV_CLASS}>
        <LoadingState />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className={cn(PAGE_BELOW_NAV_CLASS, "flex items-center justify-center")}>
        <div className="text-center">
          <h1 className="font-display text-2xl mb-2">Δεν βρέθηκε</h1>
          <Link to="/dining" className="text-primary text-sm">
            Πίσω στο Φαγητό
          </Link>
        </div>
      </div>
    );
  }

  const relatedRestaurants = (restaurants ?? []).filter((r) => r.slug !== slug).slice(0, 3);
  const mapsHref = restaurantMapsHref(restaurant);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <section className="relative min-h-[45vh] overflow-hidden bg-[#111111]">
        {restaurant.posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.posterUrl}
              alt=""
              width={1200}
              height={800}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
              aria-hidden
            />
          </>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/50 to-transparent" />
        <div className={cn(PAGE_DETAIL_HERO_INNER_CLASS, "flex h-full items-end pb-12")}>
          <div className="animate-fade-in-up">
            <Link
              to="/dining"
              className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-3 h-3" /> Πίσω στο Φαγητό
            </Link>
            <div className="flex items-center gap-3 mb-3">
              {restaurant.isNew && (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-white text-[#111111]">
                  Νέο
                </span>
              )}
              {restaurant.editorialScore && (
                <span className="px-2 py-0.5 bg-white text-[11px] font-bold text-[#111111] rounded">
                  {restaurant.editorialScore}/10
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4 text-white">{restaurant.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
              {[restaurant.category, restaurant.cuisine].filter(Boolean).length > 0 ? (
                <>
                  <span className="flex items-center gap-1">
                    <UtensilsCrossed className="w-3.5 h-3.5" />{" "}
                    {[restaurant.category, restaurant.cuisine].filter(Boolean).join(" · ")}
                  </span>
                  <span>·</span>
                </>
              ) : null}
              <span>{restaurant.priceRange}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {restaurantAreaLine(restaurant)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            <section className="animate-fade-in-up">
              <h2 className="font-display text-xl font-semibold mb-3">Σχετικά</h2>
              <p className="text-muted-foreground leading-relaxed">{restaurant.synopsis}</p>
            </section>

            {restaurant.editorialReview && (
              <section className="card-elevated animate-fade-in-up border-l-4 border-l-[#111111] p-6">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-3">
                  Κριτική Συντάκτη
                </span>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-foreground text-lg">{restaurant.editorialScore}/10</span>
                </div>
                <p className="text-foreground leading-relaxed italic text-lg">«{restaurant.editorialReview}»</p>
                <p className="text-sm text-muted-foreground mt-4">— {restaurant.editorialAuthor}</p>
              </section>
            )}

            <section>
              <h2 className="font-display text-xl font-semibold mb-4">Τοποθεσία</h2>
              <RestaurantLocationMap restaurant={restaurant} />
            </section>
          </div>

          <div className="space-y-6">
            <div className="card-elevated sticky top-28 animate-fade-in-up p-6">
              <h3 className="font-display font-semibold mb-4">Πληροφορίες</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Κουζίνα</span>
                  <p className="font-medium mt-1">{restaurant.cuisine}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Τιμές</span>
                  <p className="font-medium mt-1">{restaurant.priceRange}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Περιοχή</span>
                  <p className="mt-1 font-medium">{restaurantAreaLine(restaurant) || "—"}</p>
                </div>
                <div className="border-t border-border pt-4 space-y-3">
                  {restaurant.address || mapsHref ? (
                    <p className="flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      {mapsHref ? (
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {restaurant.address || restaurantAreaLine(restaurant)}
                          <span className="sr-only"> (χάρτης)</span>
                        </a>
                      ) : (
                        <span>{restaurant.address}</span>
                      )}
                    </p>
                  ) : null}
                  {restaurant.phone && (
                    <p className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{restaurant.phone}</span>
                    </p>
                  )}
                  {restaurantWebsiteHref(restaurant.website) ? (
                    <a
                      href={restaurantWebsiteHref(restaurant.website)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4 shrink-0" aria-hidden />
                      <span>Ιστοσελίδα</span>
                    </a>
                  ) : null}
                  {restaurantInstagramHref(restaurant.instagram) ? (
                    <a
                      href={restaurantInstagramHref(restaurant.instagram)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Instagram className="h-4 w-4 shrink-0" aria-hidden />
                      <span>{restaurantInstagramLabel(restaurant.instagram)}</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="font-display text-xl font-semibold mb-6">Μπορεί να σου αρέσει</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {relatedRestaurants.map((r, i) => (
              <RestaurantCard key={r.id} restaurant={r} index={i} />
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default DiningDetail;
