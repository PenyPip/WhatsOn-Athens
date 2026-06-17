# WhatSON — frontend

Next.js + react-router-dom (static export με **SSR HTML στο build**), δίπλα στο Strapi API.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build    # έξοδος στο `out/` (Docker/nginx)
npm run preview  # ίδιο build με `serve -s` (SPA fallback)
npm run lint
```

Το `app/[[...slug]]` δίνει στο Next το ίδιο shell σε κάθε URL (React Router)· αλλιώς `/movies` κ.λπ. έβγαζαν **404 στο refresh**. Για δοκιμή του φακέλου `out/` χωρίς nginx: `npm run preview` (χρησιμοποιεί `serve -s`).

Μεταβλητές:

- `NEXT_PUBLIC_API_URL` (default `/api`)
- `NEXT_PUBLIC_SITE_URL` — canonical / Open Graph base (π.χ. `https://the37n.gr`· στο dev default `http://localhost:3000`)
- `SITEMAP_STRAPI_URL` — (μόνο build) βάση URL για Strapi API (`/api/...`). Τοπικά: `http://127.0.0.1:1337`. Στο Docker image: default `https://the37n.gr` (το `strapi` hostname δεν υπάρχει κατά το `docker build`).

Το `npm run build` τρέχει πρώτα `scripts/generate-sitemap.mjs` (δημιουργεί `public/sitemap.xml`, `src/generated/spa-static-paths.json` και `spa-crawl-enrichment.json`). Με `SITEMAP_STRICT_MODE=1` (Docker production build) αποτυγχάνει αν το Strapi δεν είναι προσβάσιμο ή δεν επιστρέφει καθόλου δυναμικές σελίδες· λίγες URLs (< `SITEMAP_STRICT_MIN_DYNAMIC`, default 20) εκδίδουν μόνο προειδοποίηση.

**SEO / SSR στο build:** κάθε σελίδα από `app/[[...slug]]` κάνει prefetch Strapi + server-render του React Router app (χωρίς lazy στις κύριες σελίδες — πλήρες HTML, όχι «Φόρτωση…»). `generateMetadata` + JSON-LD: canonical, Open Graph, **αφίσα entity** από `spa-crawl-enrichment.json` (τίτλοι/σύνοψη από Strapi στο `npm run build`). Απαιτείται προσβάσιμο Strapi κατά το build.

**SEO client navigation:** το `usePageSeo` ενημερώνει title/description όταν αλλάζει route στο SPA (μετά το πρώτο load).

**Indexable filter URLs:** `/movies/today`, `/movies/week`, `/movies/summer`, `/movies/new`, `/movies/soon`, `/movies/genre/[slug]`, `/movies/area/[city]`, `/movies/venue/[slug]` — στο sitemap· παλιά `?section=` / `?genre=` / `?venue=` κάνουν redirect. Επιπλέον φίλτρα σε query → `noindex`.

**Security headers:** `nginx-security-headers.conf` (HSTS, X-Frame-Options, nosniff, κ.λπ.) — στο production proxy πρόσθεσε τα ίδια headers στο `nginx.conf` (block `location /` προς frontend).

Σε **`next dev`**, με `STRAPI_INTERNAL_URL` (στο Docker dev: `http://strapi:1337`) γίνεται proxy των `/admin`, `/api`, `/uploads` προς το Strapi — έτσι μπορείς να ανοίξεις π.χ. `http://localhost:3000/admin` χωρίς 404 στο Next.
