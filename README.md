# Routeflow LDN

Phase 1 foundation for a London bus fleet intelligence website.

## What is included

- Official-style public homepage with hero banner, about section, feature previews, London network summary, sidebar navigation, global search, statistics, recent activity, and network status.
- Login, registration, logout, password reset, profile, and role-permission UI foundations.
- Fleet database with search, filters, sorting, pagination, and professional bus profile modal.
- Favourite stop boards with add, rename, reorder, and 20-second refresh-ready arrivals panels.
- Route pages, live map placeholder, sightings capture, CSV export, and previous sightings.
- Separate admin panel covering dashboard, fleet management, CSV import, user management, analytics, settings, and audit logs.
- PostgreSQL schema in `docs/database-schema.sql`.

## Run locally

Open `index.html` in a browser. This first version is dependency-free so it works even before Node, Next.js, PostgreSQL, Redis, and TfL API credentials are configured.

## Recommended production stack

- Frontend: React + Next.js
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: JWT + bcrypt
- Maps: Leaflet
- Live data: TfL Unified API
- Caching: Redis
- Hosting: Vercel for frontend, Railway or DigitalOcean for backend/database

## Next implementation step

Move the static data and interactions into a Next.js app, then add the Express API, PostgreSQL migrations, JWT authentication, TfL arrivals ingestion, and Redis-backed cache refresh jobs.
