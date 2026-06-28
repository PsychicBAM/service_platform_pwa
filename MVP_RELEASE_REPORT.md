# MVP Release Checkpoint Report

**Project:** Service Platform PWA  
**Checkpoint:** Phase 3 — MVP release readiness (documentation)  
**Date:** June 2026  
**Budget context:** ~$5000 total — MVP scope complete for local/demo and deployment preparation; not yet live on a production VPS.

This report summarizes what is implemented, how to run and test it, and what remains before a real production launch.

Related docs:

- [README_BACKEND.md](./README_BACKEND.md) — API setup and tests
- [README_FRONTEND.md](./README_FRONTEND.md) — PWA setup and tests
- [DEPLOYMENT.md](./DEPLOYMENT.md) — VPS deploy guide
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) — pre-launch checklist
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) — Postgres backup commands

---

## A. Current version / status

| Area | Status |
|------|--------|
| **MVP backend** | Ready for local/demo — full API, tests, seed, E2E audit |
| **MVP frontend** | Ready for local/demo — public, client, admin, superadmin UI |
| **Production deployment** | Prepared (compose, docs, env validation, security hardening) — **not deployed** to a real VPS |
| **GitHub Actions CI** | Green — backend Docker pytest + frontend Vitest/build |
| **Payments (Stripe)** | Not implemented |
| **Email notifications** | Foundation + event wiring; dry-run audit; manual SMTP smoke script; live SMTP manual on VPS |
| **Mobile native wrapper** | Not implemented |
| **Service worker / offline** | Not implemented |

---

## B. Implemented modules

### Backend

| Module | Notes |
|--------|--------|
| Auth | Register, login, refresh tokens, JWT, role guards |
| Tenant / business model | Businesses, members, subscriptions |
| Services | Booking and order-type services, admin CRUD |
| Schedule / availability | Working hours, breaks, public availability |
| Public booking | Guest and authenticated booking creation |
| Public order | Guest and authenticated order requests |
| Guest claim API | Backend — `POST /me/claims/bookings` and `/orders` with reference + contact |
| Guest claim UI | `/me/claim` page — reference + email/phone |
| Email foundation + event wiring | `EmailService`, dry-run/disabled by default; booking/order/message notifications |
| Email dry-run audit | `scripts/check_email_notifications.py` — no real emails sent |
| Email verification dry-run audit | `scripts/check_email_verification.py` — config, templates, token hashing; no SMTP |
| Password reset dry-run audit | `scripts/check_password_reset.py` — config, templates, token hashing; no SMTP |
| Backend email verification | Verify/resend API; optional login enforcement ready (`EMAIL_VERIFICATION_REQUIRED`); disabled by default |
| Backend password reset | Request/reset API; no account enumeration |
| Email verification UI | `/verify-email`, `/check-email`; resend; non-blocking banner |
| Password reset UI | `/forgot-password`, `/reset-password`; real reset email requires SMTP |
| Manual SMTP test email | `scripts/send_test_email.py` — one explicit `--to`; operator/VPS only |
| Admin bookings | List, confirm, cancel, reschedule |
| Admin orders | List, accept, decline, complete, messages |
| Admin clients | CRM list and detail |
| Admin schedule | Working hours and breaks |
| Admin settings | Business profile and settings |
| Superadmin | Businesses, status/plan, audit logs |
| Audit logs | Platform audit trail |
| Seed demo | `scripts/seed_demo.py` — idempotent demo data |
| Backend E2E audit | `scripts/e2e_backend_audit.py` — 21 critical steps |
| Production env validation | `scripts/check_production_env.py` |
| Security hardening | Docs off in prod, CORS rules, nginx headers |

### Frontend

| Module | Notes |
|--------|--------|
| Public business page | `/b/:slug` |
| Public services list / detail | Catalog and service pages |
| Booking flow | Slot selection and booking submit |
| Order request flow | Form-based order submit |
| Login / token refresh | JWT in localStorage, 401 refresh |
| Registration | `/register` wired to POST `/auth/register`; success → `/check-email` |
| Client bookings / orders / messages | `/me/bookings`, `/me/orders`, order detail (messages auto-refresh via 1s polling) |
| Guest claim UI | `/me/claim` — reference + email/phone (no magic-link email yet) |
| Email verification UI | `/verify-email`, `/check-email`; resend; non-blocking banner |
| Password reset UI | `/forgot-password`, `/reset-password` |
| Admin dashboard | Stats and quick links |
| Admin services CRUD | Create, edit, activate/deactivate |
| Admin bookings actions | List, filter, confirm, cancel |
| Admin orders actions / messages | Accept, decline, messaging (1s polling while detail panel open) |
| Admin clients CRM | Client list and detail |
| Admin schedule edit | Weekly hours and breaks |
| Admin settings edit | Business settings form |
| Superadmin UI | Overview, businesses, audit logs |
| Vitest smoke tests | 30 tests — mocked API |
| Playwright local smoke | 12 browser tests — manual/local only |

### Infrastructure

| Item | Notes |
|------|--------|
| `docker-compose.yml` | Dev stack — reload, bind mount, port 5173/8000 |
| `docker-compose.prod.yml` | Prod-style — no reload, internal API, port 80 |
| Frontend Docker / nginx | Multi-stage build, `/api` proxy, security headers |
| GitHub Actions CI | Backend + frontend jobs |
| Deployment docs | `DEPLOYMENT.md`, `PRODUCTION_CHECKLIST.md` |
| Backup / restore docs | `BACKUP_RESTORE.md` |

---

## C. Commands

### Local dev (recommended)

From project root:

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed_demo.py
```

Frontend hot reload (separate terminal):

```bash
cd web
npm install   # first time only
npm run dev
```

- API: http://localhost:8000 (docs at `/docs`)
- Frontend: http://localhost:5173
- Postgres host port: **5433**

Stop `npm run dev` before using the Docker `web` service on port 5173.

### Production-style local (Docker nginx)

Use a separate Compose project and non-default HTTP port to avoid clashing with dev:

**Linux / macOS:**

```bash
cp .env.production.example .env   # edit secrets for real deploy; OK for smoke with placeholders + non-strict check
export WEB_HTTP_PORT=8080
docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api alembic upgrade head
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api python scripts/seed_demo.py
```

**Windows (PowerShell):**

```powershell
$env:WEB_HTTP_PORT = "8080"
docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api alembic upgrade head
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api python scripts/seed_demo.py
```

Open http://localhost:8080

### Automated checks

**Backend (dev compose):**

```bash
docker compose exec api python -m pytest
docker compose exec api python scripts/check_backend.py
docker compose exec api python scripts/check_email_verification.py
docker compose exec api python scripts/check_password_reset.py
docker compose exec api python scripts/check_email_notifications.py
docker compose exec api python scripts/send_test_email.py --to your-email@example.com   # manual VPS smoke only
docker compose exec api python scripts/seed_demo.py    # after pytest — tests truncate auth tables
docker compose exec api python scripts/e2e_backend_audit.py
```

**Frontend:**

```bash
cd web
npm run test
npm run typecheck
npm run build
npm run check:routes
npm run test:e2e    # optional — starts Vite dev server; backend + seed required
cd ..
```

**Production env validation (before real VPS deploy):**

```bash
python scripts/check_production_env.py --env-file .env.production.example   # template sanity (non-strict)
python scripts/check_production_env.py --env-file .env --strict             # after editing real .env
```

### CI (reference)

GitHub Actions runs on push/PR to `main` — see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml). Playwright is **not** in CI.

---

## D. Demo credentials

**For local and demo environments only. Never use in production.**

| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@example.com | ChangeMe123! |
| Business owner (admin) | owner@example.com | ChangeMe123! |
| Client | client@example.com | ChangeMe123! |

Demo business slug: **`demo-business`**

Seed command:

```bash
docker compose exec api python scripts/seed_demo.py
```

---

## E. Manual smoke checklist

Run after `seed_demo.py`. Use Docker dev (`localhost:5173` + `localhost:8000`) or prod-style (`localhost:8080`).

### Public

- [ ] `/b/demo-business` — business landing loads
- [ ] `/b/demo-business/services` — service catalog loads
- [ ] Booking flow — open a booking service, pick slot, submit
- [ ] Order request flow — open an order service, submit form

### Client

- [ ] Login as `client@example.com` / `ChangeMe123!`
- [ ] `/me/bookings` — sees demo booking
- [ ] `/me/orders` — sees demo order
- [ ] Order detail — view and send a message

### Admin (owner)

- [ ] Login as `owner@example.com` / `ChangeMe123!`
- [ ] `/admin` — dashboard loads with counts
- [ ] Services — list, create/edit, toggle active
- [ ] Bookings — list, confirm or cancel a pending booking
- [ ] Orders — list, accept, send message
- [ ] Clients — CRM list and client detail
- [ ] Schedule — edit working hours
- [ ] Settings — edit business settings

### Superadmin

- [ ] Login as `superadmin@example.com` / `ChangeMe123!`
- [ ] `/superadmin` — platform overview
- [ ] Businesses — list, view, change status/plan
- [ ] Audit logs — list entries

### Infrastructure spot checks

- [ ] `curl http://localhost:8000/health` (dev API)
- [ ] `curl http://localhost:5173/health` or `:8080/health` (via nginx proxy)
- [ ] Hard refresh on `/login`, `/admin`, `/b/demo-business` — no nginx 404

---

## F. Known limitations

| Limitation | Impact |
|------------|--------|
| No payments / Stripe | Bookings and orders are not paid online |
| Email foundation + event wiring | Service + templates; disabled/dry-run by default; respects `notification_email_enabled` |
| Email dry-run audit | `check_email_notifications.py` verifies wiring without SMTP; does not send real email |
| Email verification dry-run audit | `check_email_verification.py` verifies config/templates/token hashing; no real email |
| Password reset dry-run audit | `check_password_reset.py` verifies config/templates/token hashing; no real email; request never reveals account existence |
| Manual SMTP smoke | `send_test_email.py` sends one test email to explicit `--to` when live SMTP configured |
| Backend email verification | Verify/resend API; enforcement ready via `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=true`; default `false` |
| Frontend email verification chain | `/register` → `/check-email` → resend → `/verify-email`; login shows verification-required link when enforced; OAuth/social login not implemented |
| Password reset | `/forgot-password` + `/reset-password` wired; real reset email requires SMTP; request never reveals account existence; OAuth/social login not implemented |
| Guest claim backend + frontend UI | `/me/claim` — reference + contact; magic-link email not yet |
| Order messages polling | Client/admin order messages auto-refresh every 1s while page/panel is open; in-app banner for new incoming messages; WebSocket, browser push, unread counts, and dedicated messenger inbox not implemented |
| No production domain / HTTPS yet | Docs and compose prepared; VPS deploy is manual |
| No automated backups | Commands documented only in `BACKUP_RESTORE.md` |
| No monitoring / alerting | No uptime or error tracking service |
| No service worker / offline | PWA manifest only; no offline cache |
| No mobile app wrapper | Web only |
| No full browser regression suite | Vitest + limited Playwright smoke; not exhaustive |
| Single uvicorn process in prod compose | No gunicorn/multi-worker yet |
| CSP deferred | Basic nginx headers only; Content-Security-Policy not enabled |
| Playwright local/manual only | Not run in GitHub Actions CI |
| Demo seed | Creates/updates demo users and sample data — do not run on real production DB |
| `staging` APP_ENV | Docs disabled by default unless `API_DOCS_ENABLED=true` |

---

## G. Recommended next slices (safe order)

Prioritized for ~$5000 budget — infrastructure and high-value product gaps before polish:

1. **Magic-link email for guest claim** — optional email delivery instead of manual reference entry
2. **Messenger inbox** — conversations list, unread counts, client search; WebSocket optional later
3. **Payment foundation** — Stripe Checkout for deposits or full payment
4. **Production deployment to VPS** — domain, HTTPS (Caddy/NPM), real `.env`, strict env check
5. **Automated backups** — cron + off-site `pg_dump`
6. **Monitoring / logging** — uptime checks, error aggregation
7. **Mobile wrapper** — only after web MVP is stable in production
8. **CSP + hardening pass** — enable Content-Security-Policy after testing
9. **Playwright in CI** — optional staging smoke against Docker stack
10. **Multi-worker API** — gunicorn + uvicorn workers if traffic requires

---

## Summary

The MVP is **feature-complete for demo and internal pilot**: multi-tenant bookings and orders, admin and superadmin tooling, Docker dev and prod-style stacks, CI, deployment documentation, and production safety checks. It is **not yet a live production product** until VPS deploy, real secrets, HTTPS, backups, and (optionally) payments and email are added.

**Sign-off (optional):**

| Role | Name | Date |
|------|------|------|
| MVP checkpoint | | |
