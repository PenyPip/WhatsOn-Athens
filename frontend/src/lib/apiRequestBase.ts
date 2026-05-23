const API_PREFIX = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

/** Βάση URL για `new URL(API_PREFIX + endpoint, base)` — browser origin ή Strapi στο build/SSR. */
export function apiRequestBaseUrl(): string {
  if (API_PREFIX.startsWith("http://") || API_PREFIX.startsWith("https://")) return API_PREFIX;
  if (typeof window !== "undefined") return window.location.origin;
  return (
    process.env.SITEMAP_STRAPI_URL ||
    process.env.STRAPI_INTERNAL_URL ||
    "http://127.0.0.1:1337"
  ).replace(/\/$/, "");
}
