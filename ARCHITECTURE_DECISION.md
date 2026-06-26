# Architecture Decision — Backend Stack

**Status:** Accepted  
**Date:** 2026-06-26  
**Project:** Service Platform PWA

## Decision

Use **FastAPI + PostgreSQL + SQLAlchemy 2.x (async) + Alembic** for the backend API.

The frontend remains **React + Vite PWA** as defined in planning docs (not built in Phase 1).

## Alternatives Considered

| Option | Summary |
|--------|---------|
| **NestJS** (Node.js + TypeScript) | Mature modular framework, strong for large teams |
| **Django + DRF** | Batteries-included Python stack, admin UI, ORM built-in |
| **FastAPI** | Async Python, Pydantic validation, auto OpenAPI |

## Why FastAPI

- **API-first product** — bookings, orders, payments, and admin all need a clean REST API with OpenAPI/Swagger for frontend and future mobile clients.
- **Strict validation** — Pydantic models match our `API_DRAFT.md` request/response shapes with minimal boilerplate.
- **Async PostgreSQL** — slot availability and concurrent booking checks benefit from async I/O without extra infrastructure.
- **Fast MVP** — small codebase, fast iteration, fits a ~$5000 budget and solo/small-team delivery.
- **Existing workflow** — team already uses Python and Docker; no context switch to Node or Django conventions.

## Why Not NestJS (for this MVP)

- Adds TypeScript build toolchain and a heavier module/DI pattern before we have domain code to organize.
- OpenAPI is supported but not as automatic as FastAPI for our use case.
- Higher upfront structure cost for a skeleton that should stay thin until business logic is proven.

## Why Not Django (for this MVP)

- Django ORM and sync-first patterns fight async slot/booking logic unless we add complexity (Channels, async views, etc.).
- Admin site and batteries are useful but not needed yet — we build a custom admin PWA.
- Heavier framework surface area for a project that only needs API + Postgres in Phase 1.

## Budget Discipline Rules

1. **One database, one API process** — no Redis, Celery, or message queues until a measured need exists.
2. **Docker Compose for local dev only** — no Kubernetes, no managed multi-service mesh in MVP.
3. **Defer integrations** — Stripe, email, push, and native wrappers stay out until their phase.
4. **Migrations in small steps** — Alembic revisions per feature slice, not one giant schema dump.
5. **Tests on critical paths only** — health, auth guards, tenant isolation, booking overlap when implemented.
6. **OpenAPI as contract** — generated docs replace custom API documentation tooling.

## What We Will NOT Build in Phase 1

- Auth endpoints and JWT issuance (settings only, wired later)
- Business domain models (users, businesses, services, bookings, orders, …)
- Payments (Stripe)
- Email / push notifications
- Frontend or mobile wrapper
- Background workers, caching layers, or read replicas
- Production hosting / CI beyond local Docker and pytest

Phase 1 deliverable: **runnable FastAPI app, Postgres, Alembic scaffold, health checks, tests.**

## Future Options (unchanged from planning docs)

- Frontend: React + Vite PWA, mobile-first
- Payments: Stripe Checkout in Phase 4
- Notifications: email then push in Phase 5
- Optional Phase 6: Capacitor/TWA wrapper around the PWA

Stack choice does not block these; FastAPI exposes the same REST contract documented in `API_DRAFT.md`.
