# Service Platform — Backend (Phase 1 skeleton)

FastAPI backend for the Service Platform PWA: appointment bookings, service orders, clients, payments, and admin operations. Planning docs live in the project root (`PRODUCT_SPEC.md`, `API_DRAFT.md`, etc.).

## Stack

| Layer | Choice |
|-------|--------|
| Framework | FastAPI |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.x (async) + asyncpg |
| Migrations | Alembic |
| Settings | pydantic-settings |
| Tests | pytest + pytest-asyncio + httpx |
| Runtime | Docker Compose (local) |

See `ARCHITECTURE_DECISION.md` for why FastAPI was chosen and budget rules.

## Project layout

```
api/
  app/
    main.py          # FastAPI app entry
    config.py        # Pydantic settings
    database.py      # Async engine, Base, get_db
    routers/         # health, auth, services, public
    dependencies/    # auth and business guards
    models/          # SQLAlchemy ORM models (core tenant + services)
    schemas/         # Pydantic request/response models
    repositories/    # Data access
    services/        # Business logic
  alembic/           # Migrations
  tests/
  scripts/check_backend.py
docker-compose.yml   # postgres + api
.env.example
```

## Local setup

### 1. Environment file

```bash
cp .env.example .env
```

Edit `.env` if needed. **Never commit `.env`.** Default values work with Docker Compose.

Postgres is published on host port **5433** (not 5432) to avoid clashing with other local projects (e.g. Telegram bot stacks).

### 2. Run with Docker (recommended)

From project root:

```bash
docker compose down
docker compose up -d --build
docker compose logs -f api
```

Stop:

```bash
docker compose down
```

### 3. Verify endpoints

- http://localhost:8000/health
- http://localhost:8000/api/v1/health
- http://localhost:8000/docs (local/dev only)

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/health
```

### 4. Run without Docker (optional)

```bash
cd api
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Requires a running Postgres matching `DATABASE_URL` in `.env`.

## Tests

From project root:

```bash
python -m compileall api
cd api
python -m pytest
python scripts/check_backend.py
```

## Continuous integration (GitHub Actions)

On push and pull requests to `main`, [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs two jobs:

| Job | What it runs |
|-----|----------------|
| **backend-tests** | `docker compose up`, migrations, `pytest`, `check_backend.py`, `seed_demo.py`, `e2e_backend_audit.py` |
| **frontend-tests** | `npm ci`, Vitest, typecheck, build, `check:routes` in `web/` |

CI creates `.env` from `.env.example` — **no GitHub secrets required**.

**Important:** `seed_demo.py` runs after `pytest` in CI because tests truncate auth tables. The E2E audit depends on seeded demo users.

Playwright browser E2E is **not** in CI yet (needs backend + browser deps). Run locally — see [README_FRONTEND.md](./README_FRONTEND.md).

## Migrations

From `api/` (with Postgres running and `DATABASE_URL` set):

```bash
cd api
alembic upgrade head
alembic revision --autogenerate -m "describe change"
```

Initial migration `0001_initial_empty` is a placeholder. Core tenant tables are in `0002_core_tenant_models`. Services table is in `0003_services`. Schedule tables are in `0004_schedule`. Clients and bookings are in `0005_clients_bookings`.

```bash
# From project root (Docker)
docker compose exec api alembic upgrade head

# From api/ with local Postgres
cd api
alembic upgrade head
alembic revision --autogenerate -m "describe change"
```

## Current implementation status

### Completed

- FastAPI skeleton
- Health endpoints (`/health`, `/api/v1/health`)
- PostgreSQL via Docker Compose
- Alembic configured
- Core tenant models: `users`, `businesses`, `business_members`, `subscriptions`
- Migration `0002_core_tenant_models.py`
- Minimal read schemas: `UserRead`, `BusinessRead`, `SubscriptionRead`
- **Auth foundation:** register business owner, login, refresh, `/auth/me`
- Password hashing (bcrypt), JWT access/refresh tokens
- **Services CRUD** for business admins (`/api/v1/businesses/{businessId}/services`)
- **Public service catalog** (`/api/v1/public/b/{slug}/services`)
- Free plan service limit (max 3 services)
- Migration `0003_services.py`
- **Schedule CRUD** (working hours, breaks, unavailable times)
- **Availability foundation** (`/api/v1/public/b/{slug}/availability`)
- Migration `0004_schedule.py`
- **Clients and bookings models** (`clients`, `bookings` tables)
- **Availability blocks existing bookings** (pending, pending_payment, confirmed)
- Migration `0005_clients_bookings.py`
- **Public booking creation** (`POST /api/v1/public/b/{slug}/bookings`)
- **Admin booking management** (list, detail, status update, cancel)
- **Client booking self-service** (`/api/v1/me/bookings` — list, detail, cancel, reschedule)
- **Orders and order_messages database foundation** (models, migration `0006_orders.py`, repositories)
- **Public order creation** (`POST /api/v1/public/b/{slug}/orders`)
- **Admin order workflow** (list, detail, accept, decline, in-progress, complete, cancel)
- **Client my orders** (`/api/v1/me/orders` — list, detail, cancel)
- **Order messaging API** (client + admin REST message list/send)
- **Admin clients CRM API** (list, search, detail with recent bookings/orders, update contact/notes)
- **Business profile/settings API** (admin get/patch profile, settings merge, public business page)
- **Superadmin business management** (list/detail, status and plan overrides)
- **Audit logs** for superadmin status/plan changes
- **Demo seed script** (`scripts/seed_demo.py`) and **E2E backend audit** (`scripts/e2e_backend_audit.py`)
- Migration `0006_orders.py`, `0007_audit_logs.py`

### Not implemented

- Email verification
- Password reset / magic links
- Auth logout (refresh token revocation)
- Admin manual booking creation
- Dashboard analytics
- Payments (Stripe billing)
- Email/push notifications
- Frontend PWA
- Guest booking claim / magic link
- WebSocket realtime chat
- Mobile wrapper
- Redis, Celery, background workers

Next recommended phase: **Phase 2 Client PWA skeleton**, or optionally a small **dashboard summary endpoint** backend slice.

## Demo data (local development)

Seed idempotent demo users, business, services, schedule, guest sample data, and **linked client user data for `/me` pages**:

```bash
docker compose exec api python scripts/seed_demo.py
```

**Demo credentials** (local only — change in production):

| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@example.com | ChangeMe123! |
| Business owner | owner@example.com | ChangeMe123! |
| Client (linked `/me` data) | client@example.com | ChangeMe123! |

The seed also creates guest client `john.demo@example.com` with sample booking/order (not linked to a login). Use **client@example.com** to test `/me/bookings`, `/me/orders`, and order messages.

Demo business slug: `demo-business` (timezone `Europe/Moscow`, status `active`).

## E2E backend audit

Runs HTTP checks against the running API (requires Docker API + demo seed):

```bash
docker compose exec api python scripts/e2e_backend_audit.py
```

Optional base URL override:

```bash
docker compose exec api env API_BASE_URL=http://127.0.0.1:8000 python scripts/e2e_backend_audit.py
```

The script prints `PASS`/`FAIL`/`SKIP` per step and exits non-zero on critical failures.

**Checkpoint order:** Run `seed_demo.py` **after** `pytest` if you need demo users/data for manual testing or E2E — the test suite truncates auth-related tables between tests.

See also `PHASE1_BACKEND_REPORT.md` for the full Phase 1 checkpoint summary and `FRONTEND_AUDIT_REPORT.md` for the Phase 3 frontend checkpoint.

## Auth API examples

Register a business owner:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@salon.com",
    "password": "securePass123",
    "full_name": "Maria Garcia",
    "phone": "+15550100",
    "business": {
      "name": "Joe'\''s Salon",
      "slug": "joes-salon",
      "operating_mode": "both",
      "timezone": "America/New_York"
    }
  }'
```

Login:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "maria@salon.com", "password": "securePass123"}'
```

Get current user (replace `TOKEN`):

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
```

Refresh access token:

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "REFRESH_TOKEN"}'
```

## Services API examples

Create a booking service (replace `TOKEN` and `BUSINESS_ID`):

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/services \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Haircut",
    "description": "Standard haircut",
    "type": "booking",
    "duration_minutes": 30,
    "price_cents": 2500,
    "currency": "USD",
    "price_type": "fixed"
  }'
```

Create an order service:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/services \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Logo Design",
    "description": "Custom logo package",
    "type": "order",
    "price_cents": 15000,
    "currency": "USD",
    "price_type": "fixed"
  }'
```

List public services for an active business:

```bash
curl http://localhost:8000/api/v1/public/b/joes-salon/services
curl "http://localhost:8000/api/v1/public/b/joes-salon/services?type=booking"
```

## Schedule and availability API examples

Replace working hours:

```bash
curl -X PUT http://localhost:8000/api/v1/businesses/BUSINESS_ID/schedule/working-hours \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "working_hours": [
      {"day_of_week": 0, "is_open": false},
      {"day_of_week": 1, "is_open": true, "opens_at": "09:00", "closes_at": "17:00"},
      {"day_of_week": 2, "is_open": true, "opens_at": "09:00", "closes_at": "17:00"},
      {"day_of_week": 3, "is_open": true, "opens_at": "09:00", "closes_at": "17:00"},
      {"day_of_week": 4, "is_open": true, "opens_at": "09:00", "closes_at": "17:00"},
      {"day_of_week": 5, "is_open": true, "opens_at": "09:00", "closes_at": "17:00"},
      {"day_of_week": 6, "is_open": false}
    ]
  }'
```

Add a lunch break:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/schedule/breaks \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "Lunch", "day_of_week": 1, "starts_at": "12:00", "ends_at": "13:00"}'
```

Add unavailable time:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/schedule/unavailable-times \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "starts_at": "2026-06-25T10:00:00-04:00",
    "ends_at": "2026-06-25T11:00:00-04:00",
    "reason": "Staff meeting"
  }'
```

Get availability for a booking service (business must be active):

```bash
curl "http://localhost:8000/api/v1/public/b/joes-salon/availability?service_id=SERVICE_ID&date=2026-06-25"
```

Create a public booking (business must be active, slot must match availability):

```bash
curl -X POST http://localhost:8000/api/v1/public/b/joes-salon/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "SERVICE_ID",
    "starts_at": "2026-06-25T10:00:00-04:00",
    "client_notes": "First visit",
    "client": {
      "full_name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+15550101"
    }
  }'
```

Create a public order (business must be active, service type must be `order`):

```bash
curl -X POST http://localhost:8000/api/v1/public/b/joes-salon/orders \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "SERVICE_ID",
    "form_data": {
      "brief": "Need a logo redesign",
      "colors": "blue and white"
    },
    "client": {
      "full_name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+15550101"
    }
  }'
```

## Admin order API examples

List orders:

```bash
curl "http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

Get order detail:

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID \
  -H "Authorization: Bearer TOKEN"
```

Accept an order:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/accept \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quoted_price_cents": 12000, "start_work": false}'
```

Decline an order:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/decline \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decline_reason": "Out of scope for our team"}'
```

Mark order in progress:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/in-progress \
  -H "Authorization: Bearer TOKEN"
```

Complete an order:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/complete \
  -H "Authorization: Bearer TOKEN"
```

Cancel an order:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Client withdrew"}'
```

## Admin booking API examples

List bookings (replace `TOKEN` and `BUSINESS_ID`):

```bash
curl "http://localhost:8000/api/v1/businesses/BUSINESS_ID/bookings?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

Get booking detail:

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/bookings/BOOKING_ID \
  -H "Authorization: Bearer TOKEN"
```

Confirm a pending booking:

```bash
curl -X PATCH http://localhost:8000/api/v1/businesses/BUSINESS_ID/bookings/BOOKING_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

Cancel a booking:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/bookings/BOOKING_ID/cancel \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Client requested cancellation"}'
```

## Client self-service booking examples

List your bookings (requires client user linked to bookings via `clients.user_id`):

```bash
curl http://localhost:8000/api/v1/me/bookings?status=upcoming \
  -H "Authorization: Bearer CLIENT_TOKEN"
```

Get booking detail:

```bash
curl http://localhost:8000/api/v1/me/bookings/BOOKING_ID \
  -H "Authorization: Bearer CLIENT_TOKEN"
```

Cancel your booking:

```bash
curl -X POST http://localhost:8000/api/v1/me/bookings/BOOKING_ID/cancel \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Schedule conflict"}'
```

Reschedule your booking:

```bash
curl -X POST http://localhost:8000/api/v1/me/bookings/BOOKING_ID/reschedule \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"starts_at": "2026-06-25T14:00:00-04:00"}'
```

## Client self-service order examples

List your orders (requires client user linked to orders via `clients.user_id`):

```bash
curl http://localhost:8000/api/v1/me/orders?status=active \
  -H "Authorization: Bearer CLIENT_TOKEN"
```

Get order detail:

```bash
curl http://localhost:8000/api/v1/me/orders/ORDER_ID \
  -H "Authorization: Bearer CLIENT_TOKEN"
```

Cancel your order:

```bash
curl -X POST http://localhost:8000/api/v1/me/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "No longer needed"}'
```

## Order messaging examples

Client list messages:

```bash
curl http://localhost:8000/api/v1/me/orders/ORDER_ID/messages \
  -H "Authorization: Bearer CLIENT_TOKEN"
```

Client send message:

```bash
curl -X POST http://localhost:8000/api/v1/me/orders/ORDER_ID/messages \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body": "Can you share a draft timeline?"}'
```

Admin list messages:

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/messages \
  -H "Authorization: Bearer TOKEN"
```

Admin send message:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/messages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body": "We will send a draft by Friday."}'
```

## Admin clients CRM examples

List clients:

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/clients \
  -H "Authorization: Bearer TOKEN"
```

Search clients:

```bash
curl "http://localhost:8000/api/v1/businesses/BUSINESS_ID/clients?search=jane@example.com" \
  -H "Authorization: Bearer TOKEN"
```

Get client detail (includes recent bookings and orders):

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/clients/CLIENT_ID \
  -H "Authorization: Bearer TOKEN"
```

Update client contact and notes:

```bash
curl -X PATCH http://localhost:8000/api/v1/businesses/BUSINESS_ID/clients/CLIENT_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+15550101",
    "notes": "Prefers morning appointments"
  }'
```

## Business profile and settings examples

Get business profile (admin):

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID \
  -H "Authorization: Bearer TOKEN"
```

Update business profile and settings:

```bash
curl -X PATCH http://localhost:8000/api/v1/businesses/BUSINESS_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Joe'\''s Salon",
    "description": "Walk-ins welcome",
    "operating_mode": "both",
    "timezone": "America/New_York",
    "settings": {
      "cancellation_hours": 48,
      "slot_interval_minutes": 30,
      "auto_confirm_bookings": true
    }
  }'
```

Get public business page (no auth, active businesses only):

```bash
curl http://localhost:8000/api/v1/public/b/joes-salon
```

## Superadmin examples

List all businesses (superadmin token required):

```bash
curl http://localhost:8000/api/v1/superadmin/businesses \
  -H "Authorization: Bearer SUPERADMIN_TOKEN"
```

Activate a business:

```bash
curl -X PATCH http://localhost:8000/api/v1/superadmin/businesses/BUSINESS_ID \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

Change subscription plan (manual MVP override, no Stripe):

```bash
curl -X PATCH http://localhost:8000/api/v1/superadmin/businesses/BUSINESS_ID \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "starter"}'
```

List audit logs:

```bash
curl "http://localhost:8000/api/v1/superadmin/audit-logs?business_id=BUSINESS_ID" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN"
```

## Tests and PostgreSQL

Integration auth tests use PostgreSQL at `localhost:5433` by default (`TEST_DATABASE_URL` override). Start Docker Compose before running pytest.

## Previously documented — not implemented in skeleton

## API prefix

All versioned routes use `API_V1_PREFIX` (default `/api/v1`). Health is also exposed at `/health` for simple load-balancer checks.
