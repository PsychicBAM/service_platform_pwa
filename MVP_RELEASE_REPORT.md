# MVP Release Checkpoint Report

**Project:** Service Platform PWA  
**Checkpoint:** Phase 4 complete — post-Phase-4 release readiness (documentation)  
**Date:** June 2026  
**Budget context:** ~$5000 total — MVP and Phase 4 polish complete for local/demo and deployment preparation; not yet live on a production VPS.

This report summarizes what is implemented, how to run and test it, and what remains before a real production launch.

Related docs:

- [README_BACKEND.md](./README_BACKEND.md) — API setup and tests
- [README_FRONTEND.md](./README_FRONTEND.md) — PWA setup and tests
- [FRONTEND_UX_CHECKLIST.md](./FRONTEND_UX_CHECKLIST.md) — desktop/mobile UX review (Phase 4 Slice 19)
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
| Platform landing + pricing | `/` — hero, features, SaaS plans with prices/details, Choose plan → register; Stripe not implemented |
| Public services list / detail | Catalog and service pages |
| Booking flow | Slot selection and booking submit |
| Order request flow | Form-based order submit |
| Login / token refresh | JWT in localStorage, 401 refresh |
| Registration | `/register` wired to POST `/auth/register`; `selected_plan_intent` persisted in business settings; subscription remains `free` |
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
| Desktop/mobile UX polish | Phase 4 Slice 19 — spacing, responsive grids, auth/form shells; see [FRONTEND_UX_CHECKLIST.md](./FRONTEND_UX_CHECKLIST.md) |
| Vitest smoke tests | 60 tests — mocked API |
| Playwright local smoke | 19 browser tests — manual/local only |

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
python scripts/check_production_env.py --env-file .env.production.example           # template sanity (non-strict; may warn)
python scripts/check_production_env.py --env-file .env.production.example --strict  # expected to fail on placeholders
python scripts/check_production_env.py --env-file .env --strict                     # on server after real secrets
```

Secrets must live **only on the server** — never commit `.env` or `.env.production`. Legal/privacy pages are still required before public launch. Operator steps: [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md).

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
| No payments / Stripe | Bookings and orders are not paid online; landing shows static SaaS pricing only — no checkout |
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
| UX polish scope | Slice 19 fixed spacing/layout only; dedicated inbox, unread badges, and real-time messaging deferred |
| Single uvicorn process in prod compose | No gunicorn/multi-worker yet |
| CSP deferred | ~~Basic nginx headers only~~ — Slice 17 added conservative CSP; COEP/HSTS still deferred |
| Playwright local/manual only | Not run in GitHub Actions CI |
| Demo seed | Creates/updates demo users and sample data — do not run on real production DB |
| `staging` APP_ENV | Docs disabled by default unless `API_DOCS_ENABLED=true` |

---

## G. Recommended next slices (safe order)

See **Post-Phase-4 checkpoint — E. Recommended next roadmap** below for the current prioritized roadmap after Phase 4.

Legacy list (Phase 3):

1. **Magic-link email for guest claim** — optional email delivery instead of manual reference entry
2. **Messenger inbox** — conversations list, unread counts, client search; WebSocket optional later
3. **Payment foundation** — Stripe Checkout for deposits or full payment
4. **Production deployment to VPS** — domain, HTTPS (Caddy/NPM), real `.env`, strict env check
5. **Automated backups** — cron + off-site `pg_dump`
6. **Monitoring / logging** — uptime checks, error aggregation
7. **Mobile wrapper** — only after web MVP is stable in production
8. **CSP tightening + HSTS** — tighten CSP if needed; enable HSTS at production HTTPS reverse proxy
9. **Playwright in CI** — optional staging smoke against Docker stack
10. **Multi-worker API** — gunicorn + uvicorn workers if traffic requires

---

## Post-Phase-4 checkpoint

**Slice:** Phase 4 Slice 20 — documentation only. No product logic changes.  
**Purpose:** Single source of truth for what is ready after Phase 4, what is not, how to demo, and what to build next.

### A. Ready now

| Area | Status |
|------|--------|
| Public business pages | `/b/:slug`, services catalog, service detail |
| Booking flow | Date/slot selection, guest and authenticated submit |
| Order request flow | Form-based request submit |
| Client account pages | `/me/bookings`, `/me/orders`, order detail with messages |
| Guest claim | Backend API + `/me/claim` UI (reference + contact) |
| Admin dashboard | Stats, attention items, quick links |
| Admin services / bookings / orders / clients / schedule / settings | Full CRUD and operational workflows |
| Superadmin businesses / audit logs | Status, plan management, audit trail |
| Email notification foundation | `EmailService`, templates, dry-run/disabled by default |
| Email event wiring | Booking/order/message notification hooks |
| Email dry-run audit | `scripts/check_email_notifications.py` |
| SMTP test command | `scripts/send_test_email.py --to …` (manual, VPS only) |
| Email verification backend / frontend | Verify/resend API; `/verify-email`, `/check-email`; register → check-email |
| Password reset backend / frontend | Request/reset API; `/forgot-password`, `/reset-password` |
| Password reset audit | `scripts/check_password_reset.py` |
| Message polling + in-app banners | 1s polling while order page/panel open; dismissible banner for new incoming messages |
| Landing page pricing section | Hero, features, SaaS plans with prices ($0/$19/$49/$99), expandable details, Choose plan links |
| Registration plan intent | Slice 2 — `selected_plan_intent` in business.settings; subscription stays `free` on signup |
| Superadmin manual plan management | Slice 3 — active plan + signup intent UI; audited manual changes |
| Billing readiness checkpoint | Slice 4 — [BILLING_READINESS_REPORT.md](./BILLING_READINESS_REPORT.md); `check_billing_readiness.py` |
| Stripe config / env validation | Slice 5 — settings + production env checks; disabled by default; no checkout/webhooks |
| Stripe checkout session API | Slice 6 — `POST .../billing/checkout-session`; mocked tests; no plan change on create |
| Admin checkout buttons (Settings) | Slice 8 — paid plans only; `STRIPE_DISABLED` friendly message; redirects when enabled |
| Billing success/cancel pages | Slice 9 — `/billing/success`, `/billing/cancel`; webhook activates plan (not success page) |
| Billing flow smoke audit | Slice 10 — `check_billing_flow.py`; OpenAPI wiring + safe defaults; no live Stripe |
| Stripe test mode guide | Slice 11 — [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md); test keys + CLI; live Stripe not enabled |
| Security readiness baseline | Phase 6 Slice 1 — [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md), [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md); `check_security_readiness.py` |
| CodeQL code scanning | Phase 6 Slice 2 — `.github/workflows/codeql.yml`; Python + JS/TS static analysis |
| Dependency security baseline | Phase 6 Slice 3 — [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md); `npm run security:audit`, `pip-audit`; dependency-scan workflow |
| Blocking dependency scan | Phase 6 Slice 8 — `dependency-scan.yml` without `continue-on-error`; fails on future advisories |
| Trivy scan baseline | Phase 6 Slice 9 — [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md); fs/config + prod Docker images |
| Trivy findings triage | Phase 6 Slice 10 — §G; CVE baseline clean |
| Docker non-root hardening | Phase 6 Slice 11 — DS-0002; api `appuser`, nginx on port 8080 |
| Trivy blocking | Phase 6 Slice 12 — `trivy.yml` without `continue-on-error`; HIGH/CRITICAL fails workflow |
| Gitleaks secrets scan | Phase 6 Slice 13 — [SECRETS_SCAN_REPORT.md](./SECRETS_SCAN_REPORT.md); blocking; separate from CodeQL/dependency-scan/Trivy |
| OWASP ZAP readiness | Phase 6 Slice 14 — [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md); passive baseline docs; not blocking; owned URLs only |
| OWASP ZAP baseline workflow | Phase 6 Slice 15 — `.github/workflows/zap-baseline.yml`; manual `workflow_dispatch`; non-blocking localhost baseline only |
| ZAP baseline triage | Phase 6 Slice 16 — first run 0 FAIL / 6 WARN; artifact fix |
| nginx security headers | Phase 6 Slice 17 — `server_tokens off`, conservative CSP, cache headers; COEP/HSTS deferred |
| nginx CSP/cache refinement | Phase 6 Slice 18 — explicit CSP directives (10055); HTML no-store; assets immutable long-cache |
| ZAP final CSP/cache triage | Phase 6 Slice 19 — `style-src` without `unsafe-inline`; 10049/10027 triaged; COEP deferred |
| passlib/bcrypt warning cleanup | Phase 6 Slice 20 — `bcrypt<4.1.0` pin; passlib version trap removed; hashing unchanged |
| password_hash logging hygiene | Phase 6 Slice 21 — SQL echo off by default; seed_demo logs do not expose bcrypt hashes |
| VPS production readiness plan | Phase 7 Slice 1 — [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md); no live deployment |
| Production env strict validation | Phase 7 Slice 2 — `check_production_env.py --strict`; `.env.production.example` template only |
| VPS deployment runbook | Phase 7 Slice 3 — [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md); operator guide; no live deployment |
| Backup readiness baseline | Phase 7 Slice 4 — [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md); manual backup/restore; optional helpers; no cron yet |
| Backup script smoke tests | Phase 7 Slice 5 — `api/tests/test_backup_scripts.py`; no real dump/restore in CI |
| Restore drill checklist | Phase 7 Slice 6 — [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md); staging drill plan; no real restore in slice |
| Backup schedule & retention plan | Phase 7 Slice 7 — [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md); frequency, retention, cron/systemd templates; no live job in slice |
| Monitoring & logging readiness | Phase 7 Slice 8 — [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md); health/log/alert/incident plan; no live monitoring in slice |
| Demo credentials production safety gate | Phase 7 Slice 9 — `seed_demo.py` refuses production; `check_production_env.py --strict` demo-seed checks |
| Legal & privacy readiness plan | Phase 7 Slice 10 — [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md); data inventory, consent roadmap; not legal advice |
| Legal placeholder routes & footer | Phase 7 Slice 11 — `/legal/*` draft pages + footer links; lawyer review still required |
| Frontend consent checkboxes | Phase 7 Slice 12 — registration, booking, order forms; draft acknowledgment UI only |
| Backend consent enforcement | Phase 7 Slice 13 — `legal_consent_accepted` required on register, public booking, public order APIs |
| Consent audit storage design | Phase 7 Slice 14 — [CONSENT_AUDIT_STORAGE_PLAN.md](./CONSENT_AUDIT_STORAGE_PLAN.md) |
| Consent audit storage implementation | Phase 7 Slice 15 — `legal_consent_records` table; writes on register/booking/order; not legal compliance |
| Consent records read/admin access design | Phase 7 Slice 16 — [CONSENT_RECORDS_ACCESS_PLAN.md](./CONSENT_RECORDS_ACCESS_PLAN.md); staged superadmin/business APIs + UI |
| Superadmin consent read API | Phase 7 Slice 17 — `GET /api/v1/superadmin/legal-consents`; paginated, data-minimized; not legal compliance |
| Business admin consent read API | Phase 7 Slice 18 — `GET /api/v1/businesses/{business_id}/legal-consents`; tenant-scoped; not legal compliance |
| Business admin consent UI | Phase 7 Slice 19A — `/admin/legal-consents`; read-only summary table; not legal compliance |
| Superadmin consent UI | Phase 7 Slice 19B — `/superadmin/legal-consents`; platform-wide read-only table; not legal compliance |
| Data retention/deletion/export plan | Phase 7 Slice 20 — [DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md); design only; no API/UI; not legal compliance |
| Dependency advisory triage | Phase 6 Slice 4 — risk classification + upgrade roadmap (Slices 5–8); no version changes |
| pytest test-only upgrade | Phase 6 Slice 5 — `pytest>=9.0.3,<10.0.0`, `pytest-asyncio>=1.3.0`; CVE-2025-71176 cleared |
| Starlette/FastAPI runtime upgrade | Phase 6 Slice 6 — `fastapi>=0.136.3,<0.139.0` → starlette 1.3.1; pip-audit backend clean |
| Vite/esbuild upgrade | Phase 6 Slice 7 — `vite@8.1.2`, `@vitejs/plugin-react@6.0.3`; npm audit clean |
| Stripe webhook backend | Slice 7 — `POST /api/v1/billing/stripe/webhook`; `checkout.session.completed` activates plan |
| Mobile / desktop UX polish | Slice 19 — spacing, grids, auth/form shells; see [FRONTEND_UX_CHECKLIST.md](./FRONTEND_UX_CHECKLIST.md) |
| CI | GitHub Actions — backend pytest + frontend Vitest/build |
| Docker dev / prod compose | `docker-compose.yml`, `docker-compose.prod.yml` |
| Production env validation | `scripts/check_production_env.py` |
| Deployment / backup docs | `DEPLOYMENT.md`, `PRODUCTION_CHECKLIST.md`, `BACKUP_RESTORE.md` |

### B. Still not implemented

| Item | Notes |
|------|--------|
| Stripe / payments / checkout | No online payment for bookings, orders, or SaaS plans — see [BILLING_READINESS_REPORT.md](./BILLING_READINESS_REPORT.md) |
| Clickable pricing plan detail pages | Expandable details on landing cards; no separate `/pricing/:plan` routes |
| Automatic plan upgrades | Superadmin changes plans manually |
| Real production SMTP config | Requires operator `.env` on VPS; dry-run by default locally |
| Full messenger inbox | No conversation list or global message center |
| Unread message counts | No badges on nav or order list |
| Browser push notifications | In-app banners only while message view is open |
| WebSocket realtime | Messages use HTTP polling |
| OAuth / social login | Email/password only |
| Service worker / offline mode | PWA manifest only |
| Mobile app wrapper | Web responsive UI only |
| Monitoring / alerting | [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) — plan documented; not active until VPS setup |
| **Automated backups** | [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) — templates documented; configure cron/systemd on VPS only |
| **Monitoring / alerting** | [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) — plan documented; configure on VPS before launch |
| Real VPS deployment | Docs and compose prepared; not deployed to production domain |
| Data export / account deletion | [DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md) — design only; no endpoints or UI |
| Final retention / backup policy | Draft in backup docs; finalize after legal review |

### C. Manual demo checklist

Prerequisites: `docker compose up -d --build`, `alembic upgrade head`, `seed_demo.py`.  
Password for all demo users: **ChangeMe123!**

#### Public

- [ ] `/` — platform landing, hero, features, static pricing
- [ ] `/b/demo-business` — business home
- [ ] `/b/demo-business/services` — catalog (booking + request services)
- [ ] Booking service flow — pick date/slot, submit (guest or logged in)
- [ ] Order request flow — open request service, submit form

#### Client

- [ ] Login as [client@example.com](mailto:client@example.com)
- [ ] `/me/bookings` — linked demo booking visible
- [ ] `/me/orders` — linked demo order visible
- [ ] Order detail — view message thread, send reply (1s auto-refresh)
- [ ] `/me/claim` — claim guest booking/request with reference + contact
- [ ] `/forgot-password` — form loads and validates (real email needs SMTP)
- [ ] `/check-email` — post-register / verification status page

#### Admin

- [ ] Login as [owner@example.com](mailto:owner@example.com)
- [ ] `/admin` — dashboard with counts and quick links
- [ ] Services — list, create/edit, activate/deactivate
- [ ] Bookings — list, confirm/cancel, view detail
- [ ] Orders — list, accept/decline, send message in order panel
- [ ] Clients — CRM list and client detail
- [ ] Schedule — edit working hours and breaks
- [ ] Settings — edit business profile and settings

#### Superadmin

- [ ] Login as [superadmin@example.com](mailto:superadmin@example.com)
- [ ] `/superadmin/businesses` — list, view, change status/plan
- [ ] Audit logs — `/superadmin/audit-logs` shows status/plan changes

### D. Commands

**Stack up + seed:**

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed_demo.py
```

**Backend checks** (run `seed_demo.py` after `pytest` / `check_backend.py` — tests truncate auth tables):

```bash
docker compose exec api python -m pytest
docker compose exec api python scripts/check_backend.py
docker compose exec api python scripts/seed_demo.py
docker compose exec api python scripts/e2e_backend_audit.py
docker compose exec api python scripts/check_email_notifications.py
docker compose exec api python scripts/check_email_verification.py
docker compose exec api python scripts/check_password_reset.py
```

**Frontend checks:**

```bash
cd web
npm run test
npm run typecheck
npm run build
npm run check:routes
npm run test:e2e
cd ..
```

**Manual SMTP smoke** (VPS only, explicit recipient):

```bash
docker compose exec api python scripts/send_test_email.py --to your-email@example.com
```

### E. Recommended next roadmap

Practical order for remaining ~$5000 budget — product gaps before infrastructure polish:

1. **Pricing plan details + plan choice during registration** — ✅ Slice 1 done (manual billing intent; backend still Free)
2. **Stripe Checkout foundation** — deposits or SaaS subscription payments
3. **Messenger inbox** — conversation list, client search, unread counts
4. **Browser push or WebSocket** — only after inbox UX is stable
5. **VPS deployment** — domain, HTTPS, real SMTP secrets
6. **Automated backups** — cron + off-site `pg_dump`
7. **Monitoring / logging** — uptime checks, error aggregation
8. **OAuth / social login** — if needed for acquisition
9. **Mobile wrapper** — after web is stable in production
10. **CSP + Playwright in CI** — optional hardening when deploy is live

---

## Summary

The MVP is **feature-complete for demo and internal pilot**: multi-tenant bookings and orders, admin and superadmin tooling, email verification and password reset, message polling with in-app banners, landing pricing, UX polish, Docker dev and prod-style stacks, CI, and deployment documentation. It is **not yet a live production product** until VPS deploy, real secrets, HTTPS, backups, SMTP, and (optionally) payments are added.

**Post-Phase-4 sign-off (optional):**

| Role | Name | Date |
|------|------|------|
| Post-Phase-4 checkpoint | | |
