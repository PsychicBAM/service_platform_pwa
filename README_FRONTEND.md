# Service Platform — Client PWA (Phase 2)

Mobile-first client-facing Progressive Web App for browsing businesses, booking services, and placing orders.

## Stack

| Layer | Choice |
|-------|--------|
| Build | Vite 5 |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS 3 |
| Routing | React Router 6 |
| Data fetching | TanStack Query 5 |
| HTTP | Fetch wrapper (`src/api/client.ts`) |

## Prerequisites

- Node.js 18+
- Backend API running (see [README_BACKEND.md](../README_BACKEND.md))
- Demo data optional but recommended: `docker compose exec api python scripts/seed_demo.py`

## Environment

```bash
cd web
cp .env.example .env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend API base URL |

**Do not commit** `.env` or `.env.local`.

During `npm run dev`, Vite proxies `/api` to `http://localhost:8000` so you can also omit the env file and use relative URLs via proxy (set `VITE_API_BASE_URL=/api/v1` if needed).

## Install & run

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173

- Landing: `/`
- Demo business: `/b/demo-business` (loads public business API)
- Login: `/login` (stores JWT in `localStorage`)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run preview` | Preview production build |

Lint is **not configured** in this slice — add ESLint in a later slice if needed.

## PWA

- `public/manifest.webmanifest` — app name, theme color, placeholder SVG icon
- Mobile viewport meta in `index.html`
- **No service worker** yet (offline/cache deferred)

## API dependency

All data comes from the Phase 1 FastAPI backend. The frontend does not embed business logic.

Wrappers:

- `src/api/publicApi.ts` — public business, services, availability, bookings, orders
- `src/api/authApi.ts` — login, register, `/auth/me`

Token storage: `localStorage` key `access_token`. Refresh token flow is **TODO**.

## Routes (client only)

| Path | Page |
|------|------|
| `/` | Welcome + link to demo business |
| `/b/:slug` | Public business home (API) |
| `/b/:slug/services` | Services list (API) |
| `/b/:slug/services/:serviceId` | Service detail (API) |
| `/b/:slug/services/:serviceId/request` | Public order request form (order services only) |
| `/b/:slug/services/:serviceId/book` | Public booking flow (booking services only) |
| `/login` | Login form |
| `/register` | Register form (UI only) |
| `/me/bookings` | Auth-gated placeholder |
| `/me/orders` | Auth-gated placeholder |

## Implemented (Phase 2)

- Public business home, services list, and service detail (API)
- Public order request form for order-type services (guest, no login required)
- Public booking flow for booking-type services: date selection, time slots, guest form
- Inline form validation and success screens with reference numbers

## Intentionally not implemented

- Admin or superadmin dashboards
- Login-required booking / my bookings integration after guest submit
- Register submit wiring
- Token refresh
- Stripe / payments
- Email notifications
- Mobile native wrapper
- Frontend Docker / CI
- Service worker / offline mode

## Next slice

Wire authenticated client views (`/me/bookings`, `/me/orders`) and register submit.

## TODO

- Vitest / component tests for public pages
- Token refresh
