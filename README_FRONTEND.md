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
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` (dev) | Backend API base URL |

**Do not commit** `.env` or `.env.local`.

During `npm run dev`, Vite proxies `/api` to `http://localhost:8000`. You can use `VITE_API_BASE_URL=/api/v1` for same-origin requests through the dev proxy.

**Docker production** builds the app with `VITE_API_BASE_URL=/api/v1`. The `web` container nginx proxies `/api/` to the `api` service — no `localhost` in the production bundle.

## Install & run (local dev)

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173

Stop `npm run dev` before using Docker on port 5173 (same port as the production `web` container).

- Landing: `/`
- Demo business: `/b/demo-business` (loads public business API)
- Login: `/login` (stores JWT in `localStorage`)

## Production Docker frontend (full stack)

From project root (postgres + api + web):

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed_demo.py
```

Open http://localhost:5173 — nginx serves the built React app. API calls use `/api/v1` on the same host (proxied to `api:8000`).

The production `web` nginx config adds basic security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`). CSP is not enabled yet.

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Production frontend |
| http://localhost:8000/health | API health (direct) |
| http://localhost:8000/docs | API docs |

For hot reload during UI work, use `npm run dev` instead of the `web` container.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run test` | Vitest smoke tests (jsdom, mocked APIs) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright browser E2E (requires seeded backend) |
| `npm run test:e2e:headed` | Playwright E2E with visible browser |
| `npm run check:routes` | Static route/page smoke check (no browser) |
| `npm run preview` | Preview production build |

Recommended CI/local check sequence:

```bash
cd web
npm run test
npm run typecheck
npm run build
npm run check:routes
```

Playwright E2E (after backend is up and seeded — see below):

```bash
cd web
npm run test:e2e
```

Lint is **not configured** in this slice — add ESLint in a later slice if needed.

## Frontend tests (Vitest)

Smoke tests live in `web/src/test/` using **Vitest**, **React Testing Library**, and **jsdom**. They mock API modules (`publicApi`, `meApi`, `adminApi`, `superadminApi`, `useAuth`) — no real backend or browser required.

Coverage (16 tests):

- Public pages: business home, services list, service detail CTAs, order validation, booking date/slots
- Client auth: login prompts, `/me/orders`, order messages
- Admin guards: unauthenticated, no business access, dashboard, services list
- Superadmin guards: role check, businesses list, audit logs

`npm run check:routes` remains the static route file check; Vitest complements it with rendered component smoke tests.

## Playwright E2E (browser smoke)

Browser tests live in `web/e2e/` using **Playwright** (Chromium only). They hit the real Vite dev server and backend API via the dev proxy — **no API mocks**.

**Prerequisites:** Docker backend running and demo data seeded. Run `seed_demo.py` **after** `pytest` (tests truncate auth tables).

```bash
# From project root
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python -m pytest
docker compose exec api python scripts/seed_demo.py

cd web
npm install
npx playwright install chromium
npm run test:e2e
```

Coverage (9 tests A–I):

- Public: business home, services list, order validation, booking date screen
- Client: login, `/me/bookings`, `/me/orders`
- Admin: owner dashboard/services; client blocked
- Superadmin: superadmin businesses; owner blocked

Use `npm run test:e2e:headed` to watch the browser. Vitest (`npm run test`) remains fast unit/smoke tests without a backend.

Playwright starts the Vite dev server with `VITE_API_BASE_URL=/api/v1` so API calls use the dev proxy (avoids CORS issues). If you already have `npm run dev` running on port 5173 **without** that env var, stop it first — `reuseExistingServer` will reuse the existing process and E2E may fail to reach the API.

**Playwright vs Docker frontend:** `npm run test:e2e` starts the Vite dev server, not the nginx `web` container. To smoke-test the Docker production frontend, use the manual URLs above or curl/browser after `docker compose up`.

## Continuous integration (GitHub Actions)

On push and pull requests to `main`, [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **frontend-tests**:

```bash
npm ci
npm run test          # Vitest smoke (mocked APIs)
npm run typecheck
npm run build
npm run check:routes
```

Backend checks run in the parallel **backend-tests** job via Docker Compose — see [README_BACKEND.md](./README_BACKEND.md).

## Deployment readiness (VPS)

Production frontend is served by the `web` Docker service (nginx). For a future VPS deploy, see:

| Doc | Purpose |
|-----|---------|
| [DEPLOYMENT.md](../DEPLOYMENT.md) | Full stack deploy, HTTPS, updates |
| [BACKUP_RESTORE.md](../BACKUP_RESTORE.md) | Postgres backup/restore |
| [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) | Pre-launch checklist |
| [.env.production.example](../.env.production.example) | Backend production env template |

Docker production uses same-origin `/api/v1` through nginx — no `localhost` in the built bundle.

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

Token storage: `localStorage` keys `access_token`, `refresh_token`, and `token_type`. On 401, the API client calls `POST /auth/refresh` once (when a refresh token exists), stores the new access token, and retries the original request. Failed refresh clears tokens and protected routes redirect to login.

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

## Admin routes (Phase 3)

| Path | Page |
|------|------|
| `/admin` | Dashboard overview |
| `/admin/services` | Services CRUD |
| `/admin/bookings` | Bookings list + actions |
| `/admin/orders` | Orders list + actions + messages |
| `/admin/clients` | Clients CRM |
| `/admin/schedule` | Schedule edit |
| `/admin/settings` | Business settings edit |

## Superadmin routes (Phase 3)

| Path | Page |
|------|------|
| `/superadmin` | Platform overview |
| `/superadmin/businesses` | Business list + status/plan edit |
| `/superadmin/audit-logs` | Audit log viewer |

See **[FRONTEND_AUDIT_REPORT.md](../FRONTEND_AUDIT_REPORT.md)** for the Phase 3 checkpoint audit (routes, roles, flows, test results).

## Demo credentials (local)

| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@example.com | ChangeMe123! |
| Business owner | owner@example.com | ChangeMe123! |
| Client (linked `/me` data) | client@example.com | ChangeMe123! |

Demo business slug: **`demo-business`**

## Manual audit checklist

Prerequisites:

```bash
docker compose up -d
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed_demo.py
cd web && npm run dev
```

**Important:** If you ran `pytest` first, run `seed_demo.py` again before manual or E2E testing (tests truncate auth tables).

### Public / guest

- [ ] `/b/demo-business` loads business info
- [ ] Services list shows Arabic Lesson + Build Telegram Bot
- [ ] Book Arabic Lesson → pick date/slot → submit → success reference
- [ ] Request Build Telegram Bot → submit → success reference

### Client (`client@example.com`)

- [ ] `/me/bookings` shows linked booking
- [ ] `/me/orders` shows linked order
- [ ] Order detail → send message

### Owner (`owner@example.com`)

- [ ] `/admin` dashboard loads with stats
- [ ] Services: create/edit, activate/deactivate
- [ ] Bookings: filter, detail, confirm/notes
- [ ] Orders: filter, detail, accept/decline/message
- [ ] Clients: search, edit notes
- [ ] Schedule: edit hours/break/unavailable
- [ ] Settings: save profile/mode

### Superadmin (`superadmin@example.com`)

- [ ] `/superadmin/businesses` lists demo business
- [ ] Suspend business → public page fails → restore active
- [ ] Change plan → visible in audit logs

### Access denied

- [ ] `owner@example.com` → `/superadmin` blocked
- [ ] `client@example.com` → `/admin` blocked

### Automated checks

```bash
cd web
npm run typecheck
npm run build
npm run check:routes
```

## Implemented (Phase 2 + Phase 3)

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
- **Admin Settings edit** — business profile, operating mode, booking settings (slug/status read-only)
- **Admin Clients CRM** — search, client detail, edit contact/notes, recent bookings & orders
- **Admin Dashboard overview** — stats, attention items, recent bookings/orders, quick links (no charts)
- **Superadmin UI** — business list/detail, status & plan management, audit logs view
- Stripe billing still TODO
- Payments and email sending still TODO
- No charts/analytics backend yet

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

Superadmin demo credentials: **superadmin@example.com** / **ChangeMe123!**

### Manual test: Superadmin

1. Login as **superadmin@example.com** / **ChangeMe123!**
2. Open `/superadmin` — overview counts and quick links
3. Open `/superadmin/businesses` — find demo business, suspend/restore status, change plan
4. Open `/superadmin/audit-logs` — confirm status/plan changes appear
5. Login as **owner@example.com** — `/superadmin` shows “Superadmin access required”

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

- Guest claim / magic link (guest public bookings/orders → account)
- Booking reschedule UI
- Register submit wiring
- Stripe / payments
- Email notifications
- Mobile native wrapper
- Service worker / offline mode

**Playwright is local/manual for now** — not part of default CI. After seeding the backend:

```bash
docker compose up -d --build
docker compose exec api python scripts/seed_demo.py
cd web && npm run test:e2e
```

## Next slice (post-checkpoint)

Guest claim or payments (Stripe) when budget allows.
