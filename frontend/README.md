# WhatSON — frontend

Next.js SPA (static export) + react-router-dom, δίπλα στο Strapi API.

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

Σε **`next dev`**, με `STRAPI_INTERNAL_URL` (στο Docker dev: `http://strapi:1337`) γίνεται proxy των `/admin`, `/api`, `/uploads` προς το Strapi — έτσι μπορείς να ανοίξεις π.χ. `http://localhost:3000/admin` χωρίς 404 στο Next.
