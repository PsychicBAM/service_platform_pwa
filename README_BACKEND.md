> **Authenticated API calls:** Protected routes need the access token from `POST /api/v1/auth/login`. Add an `Authorization` header with that token (do not commit real tokens to git).

# Service Platform — Backend (Phase 1 skeleton)

FastAPI backend for the Service Platform PWA: appointment bookings, service orders, clients, payments, and admin operations. Planning docs live in the project root (`PRODUCT_SPEC.md`, `API_DRAFT.md`, etc.).

**MVP release checkpoint:** [MVP_RELEASE_REPORT.md](./MVP_RELEASE_REPORT.md) — what is done, how to run/test, and what remains before production.

**Billing readiness (pre-Stripe):** [BILLING_READINESS_REPORT.md](./BILLING_READINESS_REPORT.md) — manual billing today, plan table, Stripe checklist.  
**Stripe test mode (operators):** [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) — test keys, CLI webhook forwarding, local checkout flow.  
**Stripe test mode VPS runbook (Phase 8 Slice 3):** [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) — staged VPS activation (disabled → test config → test checkout → test webhook → rollback); operator-controlled; test keys only; no live payment activation.  
**Security readiness:** [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md) — pre-VPS baseline; CodeQL code scanning on GitHub (Slice 2); dependency audit commands (Slice 3).

**Post-Phase-4 status:** [MVP_RELEASE_REPORT.md § Post-Phase-4 checkpoint](./MVP_RELEASE_REPORT.md#post-phase-4-checkpoint) — ready vs not-ready, demo checklist, commands, next roadmap (Slice 20).

### Post-Phase-4 notes (backend)

- **Email verification** and **password reset** dry-run audits: `check_email_verification.py`, `check_password_reset.py` (included in `check_backend.py`).
- **Email/SMTP readiness audit (Phase 8 Slice 1)** — `check_email_readiness.py`; safe config summary, dry-run probe, optional `--strict` / `--send-test`; no real email by default (included in `check_backend.py`).
- **SMTP operator runbook (Phase 8 Slice 2)** — [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md); staged activation (disabled → dry-run → one live test → production), rollback, troubleshooting; live email is operator-controlled; no secrets in repo; no deliverability/compliance guarantee.
- **SMTP real delivery** requires operator configuration on VPS (`EMAIL_ENABLED`, SMTP credentials in `.env` — never commit secrets).
- **Registration plan intent** — `POST /auth/register` accepts `selected_plan_intent`; stored in `business.settings`; subscription plan remains `free` until manual/billing action.
- **Superadmin manual plans** — active plan stored on `subscriptions.plan`; superadmin PATCH commits to DB; signup intent stays in `business.settings`; manual changes audited; no Stripe.
- **Billing readiness checkpoint** — [BILLING_READINESS_REPORT.md](./BILLING_READINESS_REPORT.md); `scripts/check_billing_readiness.py` (included in `check_backend.py`).
- **Billing flow smoke audit (Slice 10)** — `scripts/check_billing_flow.py` verifies checkout/webhook OpenAPI wiring, plan eligibility, and Stripe-safe defaults without network calls (included in `check_backend.py`).
- **Security readiness (Phase 6 Slice 1)** — [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md), [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md); `scripts/check_security_readiness.py` checks production-unsafe config without scanners (included in `check_backend.py`).
- **CodeQL (Phase 6 Slice 2)** — `.github/workflows/codeql.yml` scans Python + JavaScript/TypeScript; static analysis only; review alerts in GitHub **Security → Code scanning**; does not replace ZAP/Trivy/dependency scans.
- **Dependency audit baseline (Phase 6 Slice 3)** — [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md); `pip-audit -r api/requirements.txt` in a disposable env; optional non-blocking `.github/workflows/dependency-scan.yml`; not in production `requirements.txt`.
- **Stripe config (Slice 5)** — `STRIPE_ENABLED=false` by default; env placeholders in `.env.example`; strict production validation when enabled.
- **Checkout session (Slice 6)** — `POST /api/v1/businesses/{business_id}/billing/checkout-session`; does not change plan on create.
- **Stripe webhook (Slice 7)** — `POST /api/v1/billing/stripe/webhook`; `checkout.session.completed` updates plan + audit log; mocked tests only.
- **Admin checkout UI (Slice 8)** — frontend calls checkout-session API from Admin Settings; redirects to Stripe when enabled; `STRIPE_DISABLED` handled in UI.
- **Billing result pages (Slice 9)** — `/billing/success` and `/billing/cancel` for Stripe redirect URLs; webhook still activates plan.
- **Legal consent enforcement (Phase 7 Slice 13)** — `legal_consent_accepted: true` required on registration, public booking, and public order create APIs; registration stores draft metadata in `business.settings`; not legal compliance.
- **Consent audit storage design (Phase 7 Slice 14)** — [CONSENT_AUDIT_STORAGE_PLAN.md](./CONSENT_AUDIT_STORAGE_PLAN.md); preferred `legal_consent_records` table.
- **Consent audit storage (Phase 7 Slice 15)** — `legal_consent_records` table; writes on registration, public booking, and public order; no IP/user-agent; not legal compliance.
- **Consent records read access design (Phase 7 Slice 16)** — [CONSENT_RECORDS_ACCESS_PLAN.md](./CONSENT_RECORDS_ACCESS_PLAN.md); staged superadmin/business admin APIs + UI (Slices 17–19).
- **Superadmin consent read API (Phase 7 Slice 17)** — `GET /api/v1/superadmin/legal-consents`; paginated, filterable, data-minimized; superadmin auth only; no UI; not legal compliance.
- **Business admin consent read API (Phase 7 Slice 18)** — `GET /api/v1/businesses/{business_id}/legal-consents`; business owner/admin only; tenant-scoped; cross-business rejected; not legal compliance.
- **Business admin consent UI (Phase 7 Slice 19A)** — `/admin/legal-consents`; read-only summary table; no sensitive fields displayed; not legal compliance.
- **Superadmin consent UI (Phase 7 Slice 19B)** — `/superadmin/legal-consents`; platform-wide read-only summary table; not legal compliance.
- **Data retention/deletion/export design (Phase 7 Slice 20)** — [DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md); design only; no export/deletion endpoints; not legal compliance.
- **Payments / Stripe** — backend checkout + webhook + admin settings checkout buttons (Slice 8); `STRIPE_ENABLED=false` by default; [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) for local test-key setup; [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) for VPS test-mode activation; live Stripe requires production checklist. Manual superadmin plan changes remain separate. No billing portal, refunds, or downgrades yet.

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

From project root — starts **postgres**, **api**, and **web** (production frontend on port 5173):

```bash
docker compose down
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed_demo.py
docker compose logs -f api
```

- Frontend: http://localhost:5173 (nginx + React build, `/api` proxied to api)
- API: http://localhost:8000

For frontend hot reload, use `cd web && npm run dev` instead of the `web` service (same port — stop one before starting the other).

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

### Email (disabled by default)

Local and test environments use `EMAIL_ENABLED=false` and `EMAIL_DRY_RUN=true` (see `.env.example`). No real SMTP is required for development; the email service returns static result codes (`EMAIL_DISABLED`, `EMAIL_DRY_RUN`) and logs subject only — never passwords or message bodies.

To enable live SMTP on a VPS, set in `.env`:

```bash
EMAIL_ENABLED=true
EMAIL_DRY_RUN=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...   # never commit
SMTP_FROM_EMAIL=noreply@your-domain.example
SMTP_FROM_NAME=Your Business Name
SMTP_USE_TLS=true
```

Run `python scripts/check_production_env.py --env-file .env --strict` on the **server** before deploy. The example template (`.env.production.example`) is not a real env file — `--strict` on it is expected to fail until placeholders are replaced on the VPS. Output uses static message codes only; no secrets are printed.

**Email verification dry-run audit** (no SMTP required, no real emails sent):

```bash
docker compose exec api python scripts/check_email_verification.py
```

Verifies imports, config (`EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS`, `EMAIL_VERIFICATION_BASE_URL`, `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN`), verification URL/template builders, token hashing (no raw token storage), mocked send path, and auth API routes. Real SMTP must still be configured on the VPS for live verification emails.

**Password reset dry-run audit** (no SMTP required, no real emails sent):

```bash
docker compose exec api python scripts/check_password_reset.py
```

Verifies imports, config (`PASSWORD_RESET_TOKEN_EXPIRE_HOURS`, `PASSWORD_RESET_BASE_URL`), reset URL/template builders, token hashing (only `token_hash` stored — no raw token column), mocked send path, and auth API routes. Real SMTP must still be configured on the VPS for live reset emails. The request endpoint always returns `{ "sent": true }` and never reveals whether an account exists.

**Email notification dry-run audit** (no SMTP required, no real emails sent):

```bash
docker compose exec api python scripts/check_email_notifications.py
```

Verifies imports, template builders, and notification service wiring with mocked sender. Real SMTP must still be configured manually on the VPS when enabling live email.

**Email/SMTP readiness audit** (no real emails sent by default):

```bash
docker compose exec api python scripts/check_email_readiness.py
```

Prints safe static summary (`EMAIL_ENABLED`, `EMAIL_DRY_RUN`, `SMTP_*=set|not_set` — never passwords). Runs a dry-run probe with static result codes. Use `--strict` before enabling live SMTP on VPS. Optional `--send-test your-email@example.com` sends **one** live message only when `EMAIL_ENABLED=true` and `EMAIL_DRY_RUN=false` (delegates to `send_test_email.py`).

**SMTP operator runbook** — staged VPS activation, rollback, and troubleshooting: [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md). Use dry-run before live mode; never commit SMTP secrets.

**Manual SMTP live smoke test** (operator only — sends one email to explicit `--to`):

```bash
docker compose exec api python scripts/send_test_email.py --to your-email@example.com
```

| Mode | Settings | Behavior |
|------|----------|----------|
| Disabled (default) | `EMAIL_ENABLED=false` | Exits with message to enable email; no send |
| Dry-run | `EMAIL_ENABLED=true`, `EMAIL_DRY_RUN=true` | Validates flow; **no real email sent** |
| Live | `EMAIL_ENABLED=true`, `EMAIL_DRY_RUN=false` + SMTP vars | Sends **one** test email to `--to` only |

Optional: `--subject "Service Platform test"` and `--body "This is a test email."`

Never use for bulk email. Do not commit SMTP secrets. Use only after configuring VPS `.env`.

**Email verification** (backend API + frontend pages):

- `POST /api/v1/auth/verify-email` — body `{ "token": "..." }`
- `POST /api/v1/auth/resend-verification` — authenticated resend
- `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=false` by default (login works without verification)
- When `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=true`, unverified login returns `403` with code `EMAIL_VERIFICATION_REQUIRED` and message “Please verify your email before logging in.”
- Verified users can always log in; demo seed marks demo users verified
- `EMAIL_VERIFICATION_BASE_URL` — link target for verification emails (e.g. `http://localhost:5173/verify-email`)
- Real delivery requires SMTP configuration on VPS

**Optional login enforcement (disabled by default):**

| Setting | Behavior |
|---------|----------|
| `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=false` (default) | Unverified users can log in |
| `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=true` | Unverified login blocked with `EMAIL_VERIFICATION_REQUIRED` |

Before enabling enforcement on production:

1. Configure live SMTP (`EMAIL_ENABLED=true`, `EMAIL_DRY_RUN=false`)
2. Run `python scripts/send_test_email.py --to your-email@example.com`
3. Run `python scripts/check_email_verification.py`
4. Ensure admin/owner accounts are verified (demo seed sets `email_verified_at`)

**Manual verification flow** (local/demo):

1. Register at `/register` → redirects to `/check-email`
2. On `/check-email`, click **Resend verification email** (dry-run logs link unless SMTP enabled)
3. Open `/verify-email?token=...` from dry-run log or test token
4. Login enforcement remains off unless `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=true`

**Password reset** (backend API + frontend pages):

- `POST /api/v1/auth/request-password-reset` — body `{ "email": "..." }`; always returns `{ "sent": true }` (no account existence leakage)
- `POST /api/v1/auth/reset-password` — body `{ "token": "...", "new_password": "..." }`; returns `{ "reset": true }`
- `PASSWORD_RESET_TOKEN_EXPIRE_HOURS=2` (default)
- `PASSWORD_RESET_BASE_URL` — link target for reset emails (e.g. `http://localhost:5173/reset-password`)
- Tokens stored as SHA-256 hash only; invalid/expired/used tokens return `PASSWORD_RESET_TOKEN_INVALID`
- Real delivery requires SMTP on VPS; tests and audits use mocked sender (no real emails)

**Manual password reset flow** (local/demo):

1. Open `/forgot-password` and submit an email → always shows a safe success message (no account enumeration)
2. With SMTP enabled, user receives email with link to `/reset-password?token=...` (dry-run logs link unless live SMTP)
3. On `/reset-password`, enter new password and confirm → redirects to login on success
4. Run `python scripts/check_password_reset.py` to verify wiring without SMTP

## Tests

From project root:

```bash
python -m compileall api
cd api
python -m pytest
python scripts/check_backend.py
python scripts/check_email_verification.py
python scripts/check_password_reset.py
python scripts/check_email_notifications.py
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

## Deployment readiness (VPS)

| File / doc | Purpose |
|------------|---------|
| [docker-compose.prod.yml](./docker-compose.prod.yml) | Production stack — no reload, no api bind mount; host `WEB_HTTP_PORT` → container nginx **8080** |
| [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) | Phase 7 — VPS readiness plan, env checklist, blockers (no live deploy yet) |
| [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) | Phase 7 — step-by-step operator guide for real VPS deploy (docs only) |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | First deploy, HTTPS, logs, updates, dev vs prod |
| [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) | Phase 7 — backup principles, checklists, optional VPS helper scripts |
| [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) | Postgres backup/restore commands (dev + prod compose) |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Pre-launch checks |
| [.env.production.example](./.env.production.example) | Production env **template only** — copy to `.env` on VPS; never commit secrets |
| [scripts/check_production_env.py](./scripts/check_production_env.py) | Validate server `.env` before deploy (`--strict`) |

**Local dev:** `docker compose up -d --build` ([docker-compose.yml](./docker-compose.yml))

**VPS / staging:**

```bash
cp .env.production.example .env   # on the VPS only
# Edit .env with real secrets on the server — never commit .env
python scripts/check_production_env.py --env-file .env --strict
docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api alembic upgrade head
```

### Production security

| Setting | Local (`.env.example`) | Production (`.env.production.example`) |
|---------|------------------------|----------------------------------------|
| `API_DOCS_ENABLED` | `true` — `/docs` available | `false` — `/docs`, `/redoc`, `/openapi.json` disabled |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Your HTTPS domain only; wildcard `*` rejected |
| `APP_ENV` | `local` | `production` |

The API refuses to start with `APP_ENV=production` and wildcard or empty `CORS_ORIGINS`. Run `python scripts/check_production_env.py --env-file .env --strict` on the server before deploy. Legal/privacy pages are still required before public launch.

The `web` nginx container adds basic security headers (see `web/nginx.conf`). Content-Security-Policy is deferred until validated against the Vite bundle.

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
- **Guest claim API** (`POST /api/v1/me/claims/bookings`, `POST /api/v1/me/claims/orders` — link guest records by reference + email/phone; no email delivery yet)
- **Email notification foundation** (`EmailService`, templates, dry-run/disabled by default)
- **Email event wiring** (booking/order create, admin status changes, order messages — best-effort, respects `notification_email_enabled`)
- **Email notification dry-run audit** (`scripts/check_email_notifications.py` — verifies wiring without SMTP)
- **Email/SMTP readiness audit** (`scripts/check_email_readiness.py` — safe config summary; no real send by default)
- **Manual SMTP test email** (`scripts/send_test_email.py` — one explicit recipient; operator/VPS only)
- **Email verification dry-run audit** (`scripts/check_email_verification.py` — config, templates, token hashing; no SMTP)
- **Password reset dry-run audit** (`scripts/check_password_reset.py` — config, templates, token hashing; no SMTP)
- **Backend email verification** (`POST /auth/verify-email`, `POST /auth/resend-verification`; login enforcement disabled by default)
- **Backend password reset** (`POST /auth/request-password-reset`, `POST /auth/reset-password`; no account enumeration; frontend `/forgot-password`, `/reset-password`)
- **Order messaging API** (client + admin REST message list/send)
- **Admin clients CRM API** (list, search, detail with recent bookings/orders, update contact/notes)
- **Business profile/settings API** (admin get/patch profile, settings merge, public business page)
- **Superadmin business management** (list/detail, status and plan overrides)
- **Audit logs** for superadmin status/plan changes
- **Demo seed script** (`scripts/seed_demo.py`) and **E2E backend audit** (`scripts/e2e_backend_audit.py`)
- Migration `0006_orders.py`, `0007_audit_logs.py`, `0008_email_verification_tokens.py`, `0009_password_reset_tokens.py`

### Not implemented

- Payments (Stripe billing)
- Auth logout (refresh token revocation)
- Admin manual booking creation
- Dashboard analytics
- Guest claim magic-link email delivery
- WebSocket realtime chat
- Mobile wrapper
- Redis, Celery, background workers

Next recommended phase: **Phase 2 Client PWA skeleton**, or optionally a small **dashboard summary endpoint** backend slice.

## Demo data (local development)

Seed idempotent demo users, business, services, schedule, guest sample data, and **linked client user data for `/me` pages**:

```bash
docker compose exec api python scripts/seed_demo.py
```

**Production safety:** `seed_demo.py` **refuses to run** when `APP_ENV=production` (exit 1, static message). Do not use demo credentials on public production. Before VPS launch, run `python scripts/check_production_env.py --env-file .env --strict`.

**Demo credentials** (local/staging only — change in production):

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

## Email verification dry-run audit

Verifies email verification config, templates, token hashing, and auth routes without SMTP (no real emails sent):

```bash
docker compose exec api python scripts/check_email_verification.py
```

## Password reset dry-run audit

Verifies password reset config, templates, token hashing (only `token_hash` stored), and auth routes without SMTP (no real emails sent):

```bash
docker compose exec api python scripts/check_password_reset.py
```

Also run automatically as part of `check_backend.py`. Real SMTP must still be configured manually when enabling live reset emails on a VPS. The request endpoint never reveals whether an account exists.

## Email notification dry-run audit

Verifies email imports, templates, and notification wiring without SMTP (no real emails sent):

```bash
docker compose exec api python scripts/check_email_notifications.py
```

Also run automatically as part of `check_backend.py`. Real SMTP must still be configured manually when enabling live email on a VPS.

## Manual SMTP test email

Operator-only command to send exactly one test email to an explicit recipient (never bulk or customer email):

```bash
docker compose exec api python scripts/send_test_email.py --to your-email@example.com
```

**Dry-run** (`EMAIL_ENABLED=true`, `EMAIL_DRY_RUN=true`): validates the flow; no real email sent.

**Live** (`EMAIL_ENABLED=true`, `EMAIL_DRY_RUN=false` with `SMTP_HOST`, `SMTP_FROM_EMAIL`, `SMTP_USER`, `SMTP_PASSWORD`): sends one test email to `--to` only.

Do not commit SMTP secrets. Not run in CI or `check_backend.py`.

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
  -H "Content-Type: application/json" \
  -d '{"label": "Lunch", "day_of_week": 1, "starts_at": "12:00", "ends_at": "13:00"}'
```

Add unavailable time:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/schedule/unavailable-times \
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
```

Get order detail:

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID \
```

Accept an order:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/accept \
  -H "Content-Type: application/json" \
  -d '{"quoted_price_cents": 12000, "start_work": false}'
```

Decline an order:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/decline \
  -H "Content-Type: application/json" \
  -d '{"decline_reason": "Out of scope for our team"}'
```

Mark order in progress:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/in-progress \
```

Complete an order:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/complete \
```

Cancel an order:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Client withdrew"}'
```

## Admin booking API examples

List bookings (replace `TOKEN` and `BUSINESS_ID`):

```bash
curl "http://localhost:8000/api/v1/businesses/BUSINESS_ID/bookings?page=1&limit=20" \
```

Get booking detail:

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/bookings/BOOKING_ID \
```

Confirm a pending booking:

```bash
curl -X PATCH http://localhost:8000/api/v1/businesses/BUSINESS_ID/bookings/BOOKING_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

Cancel a booking:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/bookings/BOOKING_ID/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Client requested cancellation"}'
```

## Client self-service booking examples

List your bookings (requires client user linked to bookings via `clients.user_id`):

```bash
curl http://localhost:8000/api/v1/me/bookings?status=upcoming \
```

Get booking detail:

```bash
curl http://localhost:8000/api/v1/me/bookings/BOOKING_ID \
```

Cancel your booking:

```bash
curl -X POST http://localhost:8000/api/v1/me/bookings/BOOKING_ID/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Schedule conflict"}'
```

Reschedule your booking:

```bash
curl -X POST http://localhost:8000/api/v1/me/bookings/BOOKING_ID/reschedule \
  -H "Content-Type: application/json" \
  -d '{"starts_at": "2026-06-25T14:00:00-04:00"}'
```

## Guest claim API (backend only)

Link a guest booking or order to your account using the booking/order reference plus the guest email or phone used at creation. No email/magic-link delivery yet; no frontend UI yet.

Claim a guest booking:

```bash
curl -X POST http://localhost:8000/api/v1/me/claims/bookings \
  -H "Content-Type: application/json" \
  -d '{"reference": "BKG-2026-000001", "email": "guest@example.com"}'
```

Claim a guest order:

```bash
curl -X POST http://localhost:8000/api/v1/me/claims/orders \
  -H "Content-Type: application/json" \
  -d '{"reference": "ORD-2026-000001", "phone": "+15550101"}'
```

Wrong reference or contact returns `404` with code `CLAIM_NOT_FOUND_OR_MISMATCH` (generic message — does not reveal which field failed).

## Client self-service order examples

List your orders (requires client user linked to orders via `clients.user_id`):

```bash
curl http://localhost:8000/api/v1/me/orders?status=active \
```

Get order detail:

```bash
curl http://localhost:8000/api/v1/me/orders/ORDER_ID \
```

Cancel your order:

```bash
curl -X POST http://localhost:8000/api/v1/me/orders/ORDER_ID/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "No longer needed"}'
```

## Order messaging examples

Client list messages:

```bash
curl http://localhost:8000/api/v1/me/orders/ORDER_ID/messages \
```

Client send message:

```bash
curl -X POST http://localhost:8000/api/v1/me/orders/ORDER_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"body": "Can you share a draft timeline?"}'
```

Admin list messages:

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/messages \
```

Admin send message:

```bash
curl -X POST http://localhost:8000/api/v1/businesses/BUSINESS_ID/orders/ORDER_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"body": "We will send a draft by Friday."}'
```

## Admin clients CRM examples

List clients:

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/clients \
```

Search clients:

```bash
curl "http://localhost:8000/api/v1/businesses/BUSINESS_ID/clients?search=jane@example.com" \
```

Get client detail (includes recent bookings and orders):

```bash
curl http://localhost:8000/api/v1/businesses/BUSINESS_ID/clients/CLIENT_ID \
```

Update client contact and notes:

```bash
curl -X PATCH http://localhost:8000/api/v1/businesses/BUSINESS_ID/clients/CLIENT_ID \
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
```

Update business profile and settings:

```bash
curl -X PATCH http://localhost:8000/api/v1/businesses/BUSINESS_ID \
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
```

Activate a business:

```bash
curl -X PATCH http://localhost:8000/api/v1/superadmin/businesses/BUSINESS_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

Change subscription plan (manual MVP override, no Stripe):

```bash
curl -X PATCH http://localhost:8000/api/v1/superadmin/businesses/BUSINESS_ID \
  -H "Content-Type: application/json" \
  -d '{"plan": "starter"}'
```

List audit logs:

```bash
curl "http://localhost:8000/api/v1/superadmin/audit-logs?business_id=BUSINESS_ID" \
```

## Tests and PostgreSQL

Integration auth tests use PostgreSQL at `localhost:5433` by default (`TEST_DATABASE_URL` override). Start Docker Compose before running pytest.

## Previously documented — not implemented in skeleton

## API prefix

All versioned routes use `API_V1_PREFIX` (default `/api/v1`). Health is also exposed at `/health` for simple load-balancer checks.