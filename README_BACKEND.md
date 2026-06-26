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

## Migrations

From `api/` (with Postgres running and `DATABASE_URL` set):

```bash
cd api
alembic upgrade head
alembic revision --autogenerate -m "describe change"
```

Initial migration `0001_initial_empty` is a placeholder. Core tenant tables are in `0002_core_tenant_models`. Services table is in `0003_services`. Schedule tables are in `0004_schedule`.

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

### Not implemented

- Email verification
- Password reset / magic links
- Auth logout (refresh token revocation)
- Booking creation
- Order creation
- Payments (Stripe)
- Notifications (email/push)
- Frontend PWA
- Redis, Celery, background workers

Next slice: booking and order creation per `MVP_PLAN.md` Phase 1.

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

## Tests and PostgreSQL

Integration auth tests use PostgreSQL at `localhost:5433` by default (`TEST_DATABASE_URL` override). Start Docker Compose before running pytest.

## Previously documented — not implemented in skeleton

## API prefix

All versioned routes use `API_V1_PREFIX` (default `/api/v1`). Health is also exposed at `/health` for simple load-balancer checks.
