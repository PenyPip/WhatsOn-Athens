import { normalizeVenueCity, VENUE_AREA_LABELS } from "@/lib/venueArea";
import { normalizeHttpUrl, resolveGoogleMapsEmbedSrc, resolveGoogleMapsHref } from "@/lib/venueResolve";
import type { StrapiRestaurant } from "@/lib/api";

/** Γραμμή τοποθεσίας: περιοχή (CMS neighborhood) + πόλη. */
export function restaurantAreaLine(restaurant: Pick<StrapiRestaurant, "neighborhood" | "city">): string {
  const area = typeof restaurant.neighborhood === "string" ? restaurant.neighborhood.trim() : "";
  const cityKey = normalizeVenueCity(restaurant.city);
  const city = cityKey ? VENUE_AREA_LABELS[cityKey] : typeof restaurant.city === "string" ? restaurant.city.trim() : "";
  return [area, city].filter(Boolean).join(", ");
}

/** Κείμενο αναζήτησης χάρτη: διεύθυνση, περιοχή, όνομα. */
export function restaurantLocationQuery(
  restaurant: Pick<StrapiRestaurant, "name" | "address" | "neighborhood" | "city">,
): string {
  const address = typeof restaurant.address === "string" ? restaurant.address.trim() : "";
  const area = restaurantAreaLine(restaurant);
  const name = typeof restaurant.name === "string" ? restaurant.name.trim() : "";
  const parts = [address, area, name].filter(Boolean);
  return [...new Set(parts)].join(", ");
}

export function restaurantMapsHref(
  restaurant: Pick<StrapiRestaurant, "name" | "address" | "neighborhood" | "city" | "googleMapsUrl">,
): string | null {
  const query = restaurantLocationQuery(restaurant);
  return resolveGoogleMapsHref(restaurant.googleMapsUrl, query || restaurant.address);
}

export function restaurantMapsEmbedSrc(
  restaurant: Pick<StrapiRestaurant, "name" | "address" | "neighborhood" | "city" | "googleMapsUrl">,
): string | null {
  const query = restaurantLocationQuery(restaurant);
  return resolveGoogleMapsEmbedSrc(restaurant.googleMapsUrl, query);
}

export function restaurantWebsiteHref(raw: string | undefined | null): string | null {
  return normalizeHttpUrl(raw);
}

export function restaurantInstagramHref(raw: string | undefined | null): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  if (s.startsWith("@")) {
    const handle = s.slice(1).replace(/^@+/, "").replace(/\/+$/, "");
    return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : null;
  }
  const asUrl = normalizeHttpUrl(s);
  if (asUrl) return asUrl;
  if (/instagram\.com/i.test(s)) return normalizeHttpUrl(s.startsWith("http") ? s : `https://${s}`);
  const handle = s.replace(/^@+/, "").replace(/\/+$/, "");
  return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : null;
}

export function restaurantInstagramLabel(raw: string | undefined | null): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "Instagram";
  if (s.startsWith("@")) return s;
  try {
    const u = new URL(normalizeHttpUrl(s) ?? s);
    const parts = u.pathname.split("/").filter(Boolean);
    const handle = parts[0];
    return handle ? `@${handle}` : "Instagram";
  } catch {
    return s.replace(/^https?:\/\//i, "").replace(/^www\./i, "") || "Instagram";
  }
}
