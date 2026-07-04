# VPS Production Readiness Report — Phase 7 (Slice 4)

**Purpose:** Plan and checklist for a future **real VPS deployment**.  
**Not in scope:** Live server provisioning, DNS changes, HTTPS certificates, or committing secrets.  
**Status:** Planning only — **no deployment performed**. Operator runbook: [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md). Backup baseline: [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) (Slice 4).

Related: [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) · [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) · [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) · [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) · [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [docker-compose.prod.yml](./docker-compose.prod.yml) · [.env.production.example](./.env.production.example) · [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md)

---

## A. Current production readiness status

| Area | Status |
|------|--------|
| **Local builds** | ✅ Frontend (`npm run build`) and backend Docker images build successfully |
| **Production Compose** | ✅ `docker-compose.prod.yml` — no bind mounts, no `--reload`, API `expose` only |
| **Non-root containers** | ✅ API `appuser`, web `nginx` on internal port **8080** |
| **Security scans** | ✅ CI, CodeQL, dependency-scan (blocking), Trivy (blocking), Gitleaks (blocking) green |
| **ZAP baseline** | ✅ Manual, non-blocking; triaged in [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) |
| **nginx headers** | ✅ CSP baseline, cache headers, `server_tokens off` (Slices 17–19) |
| **Stripe** | ✅ Integrated; **`STRIPE_ENABLED=false` by default** — test/live keys on VPS only |
| **SMTP / live email** | ⏳ Requires VPS `.env` + provider; dry-run audits pass locally; operator runbook: [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) |
| **Production env validation** | ✅ `scripts/check_production_env.py --strict` — polished (Slice 2); static message codes only |
| **VPS deployment runbook** | ✅ [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) — operator guide (Slice 3); no live deploy |
| **Backup readiness** | ✅ [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) — manual backup/restore baseline (Slice 4); no automated schedule yet |
| **Legal / privacy pages** | ❌ [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) — plan documented; **blocker before public launch** (not legal advice) |
| **Real VPS deployment** | ❌ **Not done yet** — next major phase |

---

## B. Required VPS resources

| Resource | Notes |
|----------|--------|
| **VPS** | Linux host with Docker Engine + Docker Compose v2 |
| **Domain name** | Public hostname for frontend + API (same origin via nginx proxy) |
| **DNS** | `A` / `AAAA` record → VPS public IP |
| **HTTPS reverse proxy** | Caddy, Nginx, or Traefik in front of `web` container host port (`WEB_HTTP_PORT`, default **80**) |
| **PostgreSQL storage** | Named volume `service_platform_postgres_prod_data`; plan disk size |
| **Backups** | Off-host `pg_dump` — [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md), [BACKUP_RESTORE.md](./BACKUP_RESTORE.md); optional `scripts/backup_postgres.sh` |
| **SMTP provider** | Transactional email (verification, reset, notifications) |
| **Stripe** | Test keys first ([STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md)); live keys only after checklist |
| **Monitoring / logs** | ⏳ [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) — plan documented; not active until VPS setup |
| **SSH access** | Key-based deploy user; firewall 22/80/443 only |

**Internal ports (containers):** `web` nginx **8080**, `api` **8000** (not published in prod compose).

---

## C. Production environment variables checklist

Copy [.env.production.example](./.env.production.example) → `.env` **on the server only**. The example file is a **template only** — placeholders are intentionally unsafe for `--strict`. **Secrets must live only on the server**, never in git.

### Application

| Variable | Required | Example / placeholder |
|----------|----------|-------------------------|
| `APP_ENV` | Yes | `production` |
| `APP_NAME` | Yes | `Service Platform API` |
| `API_V1_PREFIX` | Yes | `/api/v1` |
| `API_DOCS_ENABLED` | Yes | `false` |
| `SQLALCHEMY_ECHO` | Recommended | `false` (no SQL bind-param logging) |

### Database

| Variable | Required | Example / placeholder |
|----------|----------|-------------------------|
| `POSTGRES_USER` | Yes | `service_platform` |
| `POSTGRES_PASSWORD` | Yes | `CHANGE_ME_STRONG_POSTGRES_PASSWORD` |
| `POSTGRES_DB` | Yes | `service_platform` |
| `DATABASE_URL` | Yes | `postgresql+asyncpg://service_platform:CHANGE_ME_STRONG_POSTGRES_PASSWORD@postgres:5432/service_platform` |

### Compose / networking

| Variable | Required | Example / placeholder |
|----------|----------|-------------------------|
| `WEB_HTTP_PORT` | Yes | `80` (host → container `8080`) |
| `CORS_ORIGINS` | Yes | `https://your-domain.example` |
| `PUBLIC_APP_URL` | Ops | `https://your-domain.example` |
| `PUBLIC_API_URL` | Ops | `https://your-domain.example/api/v1` |

### Auth

| Variable | Required | Example / placeholder |
|----------|----------|-------------------------|
| `JWT_SECRET_KEY` | Yes | `CHANGE_ME_GENERATE_A_LONG_RANDOM_SECRET` |
| `JWT_ALGORITHM` | Yes | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Yes | `30` |

### Email

| Variable | Required when live | Example / placeholder |
|----------|-------------------|-------------------------|
| `EMAIL_ENABLED` | Yes | `false` until SMTP ready |
| `EMAIL_DRY_RUN` | Yes | `true` until SMTP verified |
| `SMTP_HOST` | If live email | provider hostname |
| `SMTP_PORT` | If live email | `587` |
| `SMTP_USER` | If auth required | provider username |
| `SMTP_PASSWORD` | If auth required | `CHANGE_ME` |
| `SMTP_FROM_EMAIL` | If live email | `noreply@your-domain.example` |
| `SMTP_FROM_NAME` | Optional | `Service Platform` |
| `SMTP_USE_TLS` | Yes | `true` |
| `EMAIL_VERIFICATION_BASE_URL` | Yes | `https://your-domain.example/verify-email` |
| `EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS` | Yes | `24` |
| `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN` | Yes | `false` until SMTP + policy ready |
| `PASSWORD_RESET_BASE_URL` | Yes | `https://your-domain.example/reset-password` |
| `PASSWORD_RESET_TOKEN_EXPIRE_HOURS` | Yes | `2` |

### Stripe (platform billing)

| Variable | Required when enabled | Example / placeholder |
|----------|----------------------|-------------------------|
| `STRIPE_ENABLED` | Yes | `false` until ready |
| `STRIPE_SECRET_KEY` | If enabled | `sk_test_REDACTED` or live key on VPS only |
| `STRIPE_WEBHOOK_SECRET` | If enabled | `whsec_REDACTED` |
| `STRIPE_PRICE_STARTER` | If enabled | Stripe Price ID |
| `STRIPE_PRICE_BUSINESS` | If enabled | Stripe Price ID |
| `STRIPE_PRICE_PRO` | If enabled | Stripe Price ID |
| `STRIPE_SUCCESS_URL` | If enabled | `https://your-domain.example/billing/success` |
| `STRIPE_CANCEL_URL` | If enabled | `https://your-domain.example/billing/cancel` |

**Validate before deploy:**

```bash
# Template sanity (non-strict may pass with warnings; strict fails on placeholders — expected):
python scripts/check_production_env.py --env-file .env.production.example
python scripts/check_production_env.py --env-file .env.production.example --strict

# On the VPS after editing real secrets (must exit 0):
python scripts/check_production_env.py --env-file .env --strict
```

**Strict mode fails on:** non-production `APP_ENV`, placeholder/weak `JWT_SECRET_KEY`, wildcard or empty `CORS_ORIGINS`, `API_DOCS_ENABLED=true`, placeholder `DATABASE_URL`, invalid `WEB_HTTP_PORT`, `SQLALCHEMY_ECHO=true`, localhost/placeholder public email URLs, live email without SMTP, Stripe enabled without required fields.

---

## D. Deployment steps draft

High-level runbook for a future VPS. **Step-by-step operator guide:** [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md). Summary:

1. **Prepare VPS** — OS updates, deploy user, firewall (22/80/443), SSH keys.
2. **Install Docker** — Engine + Compose plugin.
3. **Clone repo** — tagged release or `main` at known-good commit.
4. **Create `.env`** — `cp .env.production.example .env` on server only.
5. **Fill secrets on server** — JWT, Postgres password, CORS, URLs; never in git.
6. **Validate env** — `python scripts/check_production_env.py --env-file .env --strict`.
7. **Build containers** — `docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build`.
8. **Run migrations** — `docker compose -p service_platform_prod -f docker-compose.prod.yml exec api alembic upgrade head`.
9. **Seed demo** — **staging only** if needed; **do not** use default demo passwords on public production.
10. **Reverse proxy + HTTPS** — terminate TLS; route to `WEB_HTTP_PORT` (container nginx on **8080** internally).
11. **Production checks** — `check_security_readiness.py`, audit scripts, smoke checklist (§E).
12. **Backups** — cron `pg_dump` per [BACKUP_RESTORE.md](./BACKUP_RESTORE.md); test restore once.
13. **Monitoring** — [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md); health uptime, log review, alert plan; configure on VPS before launch.
14. **Smoke tests** — §E on HTTPS URL; optional manual ZAP baseline on **owned** staging URL.

---

## E. Production smoke checklist

Run on **HTTPS staging** before public launch. Use test accounts — do not log tokens or secrets.

| # | Check | Pass |
|---|--------|------|
| 1 | `GET /` — SPA loads | ☐ |
| 2 | `GET /health` — nginx → API health OK | ☐ |
| 3 | `GET /api/v1/health` or API health via proxy | ☐ |
| 4 | Register test business (or pre-provision owner) | ☐ |
| 5 | Login owner → `/admin` dashboard | ☐ |
| 6 | Create / edit service | ☐ |
| 7 | Public booking flow (guest or client) | ☐ |
| 8 | Client login → `/me/bookings` or `/me/orders` | ☐ |
| 9 | Admin order flow + message thread | ☐ |
| 10 | Superadmin login → platform businesses view | ☐ |
| 10 | Email readiness — `check_email_readiness.py` (no real send) | ☐ |
| 11 | Email test — follow [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) Stage 3; one explicit recipient only | ☐ |
| 12 | Stripe test checkout — only after `STRIPE_ENABLED=true` + webhook URL | ☐ |

**Hard refresh:** `/login`, `/admin`, `/b/<slug>` must not 404 (nginx SPA fallback).

---

## F. Security gates before real launch

| Gate | Status (pre-VPS) |
|------|------------------|
| CI green | ✅ |
| CodeQL green | ✅ |
| dependency-scan blocking | ✅ |
| Trivy blocking | ✅ |
| Gitleaks blocking | ✅ |
| ZAP baseline reviewed | ✅ triaged; re-run on staging URL recommended |
| `check_production_env.py --strict` | Required on server `.env` before go-live |
| `check_security_readiness.py` | Required with production `.env` on staging |
| Legal / privacy / consent pages | ❌ [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) — required before public launch; lawyer review needed |
| Demo credentials changed / disabled | Required on production — `check_production_env.py --strict` + no `seed_demo.py` |
| Backups tested (restore drill) | Required before launch |
| HTTPS only on public URL | Required |
| API port 8000 not public | Required (prod compose uses `expose` only) |

---

## G. Known blockers before public launch

| Blocker | Notes |
|---------|--------|
| **Legal / privacy / consent pages** | ❌ [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) — launch blocker; final docs need lawyer review |
| **Live SMTP** | Not configured; email verification/reset/notifications need provider |
| **Live Stripe on VPS** | `STRIPE_ENABLED=false`; test webhook + HTTPS URL not validated on server |
| **Automated backups** | Documented manually; no cron/object-storage automation in repo |
| **Monitoring / alerts** | ⏳ [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) — required before public launch; not configured yet |
| **Domain + HTTPS VPS** | No real deployment yet |
| **Demo seed on production** | ❌ `seed_demo.py` refuses `APP_ENV=production`; use unique credentials on public prod |

---

## H. Local prod-compose smoke (Slice 1–2)

Safe local validation **without** a real VPS:

```bash
cp .env.production.example .env   # template only — edit on server for real deploy
# Strict on the example is expected to fail until secrets are replaced on the VPS.

WEB_HTTP_PORT=8080 docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
curl http://localhost:8080/health
curl -I http://localhost:8080/
docker compose -p service_platform_prod -f docker-compose.prod.yml down
```

**Note:** Internal `web` nginx listens on **8080**; host mapping is `${WEB_HTTP_PORT}:8080`.

---

**Last updated:** Phase 7 Slice 10 — legal and privacy readiness plan (not legal advice).
