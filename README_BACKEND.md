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
    routers/         # health, auth
    dependencies/    # auth guards
    models/          # SQLAlchemy ORM models (core tenant tables)
    schemas/         # Pydantic request/response models
    repositories/    # Data access (later)
    services/        # Business logic (later)
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

Initial migration `0001_initial_empty` is a placeholder. Core tenant tables are in `0002_core_tenant_models`.

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

### Not implemented

- Email verification
- Password reset / magic links
- Auth logout (refresh token revocation)
- Services, bookings, orders, clients
- Payments (Stripe)
- Notifications (email/push)
- Frontend PWA
- Redis, Celery, background workers

Next slice: services CRUD and public business catalog per `MVP_PLAN.md` Phase 1.

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

## Tests and PostgreSQL

Integration auth tests use PostgreSQL at `localhost:5433` by default (`TEST_DATABASE_URL` override). Start Docker Compose before running pytest.

## Previously documented — not implemented in skeleton

## API prefix

All versioned routes use `API_V1_PREFIX` (default `/api/v1`). Health is also exposed at `/health` for simple load-balancer checks.
