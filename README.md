# WhatSON Athens 🎬🎭

Modern Greek entertainment platform — movies, theater, booking.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind + shadcn/ui
- **CMS**: Strapi 5 + MySQL
- **Infra**: Docker Compose + Nginx

## Quick Start

### 1. Clone & setup env

```bash
cp strapi/.env.example strapi/.env
cp frontend/.env.example frontend/.env
```

Edit `strapi/.env` and set secure values for `APP_KEYS`, `JWT_SECRET`, `ADMIN_JWT_SECRET`, etc.

### 2. Run with Docker

```bash
docker-compose up --build
```

First boot takes ~3-5 minutes (Strapi builds + seeds data).

### 3. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Strapi Admin | http://localhost/admin |
| Strapi API | http://localhost/api |

### 4. Create Strapi admin user

On first boot, visit http://localhost/admin and register your admin account.

---

## Development (without Docker)

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# → http://localhost:5173
```

### Strapi
```bash
cd strapi
npm install
cp .env.example .env
# Edit .env with your local MySQL credentials
npm run develop
# → http://localhost:1337/admin
```

---

## Content Types

| Type | Description |
|------|-------------|
| Movie | Films with showtimes |
| Theater Show | Performances, musicals, dance |
| Venue | Cinemas & theaters |
| Showtime | Scheduled screening/performance |
| Review | Editorial & user reviews |
| Booking | Ticket reservations |

## API Endpoints (Public)

```
GET  /api/movies?populate=poster
GET  /api/movies?filters[slug][$eq]=dune-part-two&populate=*
GET  /api/theater-shows?populate=poster,venue
GET  /api/venues
GET  /api/showtimes?filters[movie][id][$eq]=1&populate=venue
GET  /api/reviews?filters[is_editorial][$eq]=true
POST /api/bookings
```

---

## Seed Data

On first run, Strapi automatically seeds:
- 4 movies (Poor Things, Dune: Part Two, Anatomy of a Fall, The Holdovers)
- 3 theater shows (Μήδεια, Mamma Mia!, Swan Lake)
- 4 venues (2 Athens, 1 Thessaloniki)
- 8 showtimes
- 4 reviews (3 editorial, 1 user)
