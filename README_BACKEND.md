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
    routers/         # Route modules (health only for now)
    models/          # SQLAlchemy models (empty scaffold)
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

Initial migration `0001_initial_empty` is a placeholder. Business tables will be added in later revisions per `DATA_MODEL_DRAFT.md`.

## Not implemented in this step

- Auth logic (JWT wiring only in settings)
- Business domain models (users, businesses, services, …)
- Bookings and orders
- Payments (Stripe)
- Notifications (email/push)
- Frontend PWA
- Redis, Celery, background workers

Next slices: auth + `users` / `businesses` tables, then services and schedule per `MVP_PLAN.md` Phase 1.

## API prefix

All versioned routes use `API_V1_PREFIX` (default `/api/v1`). Health is also exposed at `/health` for simple load-balancer checks.
