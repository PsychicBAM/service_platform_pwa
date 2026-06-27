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
- `src/api/authApi.ts` — login, register, logout, `/auth/me`
- `src/api/meApi.ts` — `/me/bookings`, `/me/orders`, order messages

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
| `/me/bookings` | My bookings list (auth required) |
| `/me/orders` | My orders list (auth required) |
| `/me/orders/:orderId` | Order detail + messages (auth required) |

## Implemented (Phase 2)

- Public business home, services list, and service detail (API)
- Public order request form for order-type services (guest, no login required)
- Public booking flow for booking-type services: date selection, time slots, guest form
- My Bookings and My Orders pages wired to `/me/*` APIs
- Order detail with message list (15s polling) and send form
- Login/logout with JWT in `localStorage`
- Inline form validation and success screens with reference numbers

## Admin PWA skeleton (Phase 3 slice 1)

Read-only admin area at `/admin` for business members:

| Path | Page |
|------|------|
| `/admin` | Dashboard |
| `/admin/services` | Services list |
| `/admin/bookings` | Bookings list |
| `/admin/orders` | Orders list |
| `/admin/clients` | Clients list |
| `/admin/schedule` | Schedule summary |
| `/admin/settings` | Business settings summary |

- **AdminGuard** — requires login + business membership from `/auth/me`
- **AdminLayout** — mobile nav + desktop sidebar
- **adminApi.ts** — lightweight wrappers for next slices
- **Admin Services CRUD** — create/edit booking & request services, activate/deactivate, soft delete
- **Admin Bookings actions** — list with filters, detail view, confirm/complete/no-show/cancel, admin notes
- **Admin Orders actions** — list with filters, detail view, accept/decline/in-progress/complete/cancel, admin notes & quoted price, order messages
- **Admin Schedule edit** — weekly working hours, breaks, unavailable times
- Payments and email notifications still TODO
- Superadmin UI still TODO

### Manual test: Admin

```bash
docker compose exec api python scripts/seed_demo.py
cd web && npm run dev
```

1. Login as **owner@example.com** / **ChangeMe123!**
2. Open `/admin` — dashboard shows demo business name
3. Browse services, bookings, orders, clients, schedule, settings
4. Logout works
5. Login as **client@example.com** — `/admin` shows “No business access”

Owner demo credentials: **owner@example.com** / **ChangeMe123!**

### Guest vs account-linked data

`/me/bookings` and `/me/orders` only show items where the backend `Client.user_id` matches the logged-in user. **Guest bookings and orders created without login do not appear yet** — guest claim / magic link is not implemented.

Demo seed creates:
- **Guest** sample data for `john.demo@example.com` (public flows only)
- **Linked client login** for manual `/me` testing:

| Email | Password |
|-------|----------|
| client@example.com | ChangeMe123! |

### Manual test: My Bookings / My Orders

```bash
docker compose up -d
docker compose exec api python scripts/seed_demo.py
cd web && npm run dev
```

1. Open http://localhost:5173/login
2. Sign in as **client@example.com** / **ChangeMe123!**
3. Open http://localhost:5173/me/bookings — expect Arabic Lesson booking
4. Open http://localhost:5173/me/orders — expect Build Telegram Bot request
5. Open order detail → view messages → send a reply

## Intentionally not implemented

- Full admin order action forms (accept, decline, complete, etc.)
- Manual admin booking creation
- Superadmin UI
- Admin or superadmin dashboards with analytics
- Guest claim / magic link (guest public bookings/orders → account)
- Booking reschedule UI
- Register submit wiring
- Token refresh
- Stripe / payments
- Email notifications
- Mobile native wrapper
- Frontend Docker / CI
- Service worker / offline mode

## Next slice

Admin order actions and schedule editing.

## TODO

- Vitest / component tests for public and account pages
- Token refresh
- Reschedule booking UI
- Admin order action UI
- Manual admin booking creation
- Booking list search
- Payments (Stripe)
