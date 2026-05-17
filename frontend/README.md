# WhatSON — frontend

Next.js SPA (static export) + react-router-dom, δίπλα στο Strapi API.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build    # έξοδος στο `out/` (Docker/nginx)
npm run lint
```

Μεταβλητές: `NEXT_PUBLIC_API_URL` (default `/api`). Σε **`next dev`**, με `STRAPI_INTERNAL_URL` (στο Docker dev: `http://strapi:1337`) γίνεται proxy των `/admin`, `/api`, `/uploads` προς το Strapi — έτσι μπορείς να ανοίξεις π.χ. `http://localhost:3000/admin` χωρίς 404 στο Next.
