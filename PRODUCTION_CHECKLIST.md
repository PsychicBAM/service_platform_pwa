# Production checklist

Use this before and after deploying to a VPS. Not every item applies to a private demo server — mark N/A where appropriate.

Related: [DEPLOYMENT.md](./DEPLOYMENT.md), [BACKUP_RESTORE.md](./BACKUP_RESTORE.md), [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md), [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md), [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md), [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md), [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md), [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md), [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md), [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md)

---

## VPS deployment (Phase 7)

- [x] **VPS readiness plan** — [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md); env checklist, deployment steps, smoke tests documented
- [x] **Production env strict validation** — Slice 2: `check_production_env.py --strict`; static codes; `.env.production.example` template only
- [x] **VPS deployment runbook** — Slice 3: [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md); operator guide for later real deploy; no live deployment in slice
- [x] **Backup readiness baseline** — Slice 4: [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md); manual backup/restore + optional helpers; no automated schedule yet
- [x] **Backup script smoke tests** — Slice 5: `api/tests/test_backup_scripts.py`; no real dump/restore in tests
- [x] **Restore drill checklist** — Slice 6: [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md); staging drill documented; no real restore in slice
- [x] **Backup schedule & retention plan** — Slice 7: [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md); cron/systemd templates documented; no live job installed
- [x] **Monitoring & logging readiness** — Slice 8: [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md); health/log/alert plan documented; no live monitoring configured
- [x] **Demo credentials production safety gate** — Slice 9: `seed_demo.py` refuses `APP_ENV=production`; `check_production_env.py --strict` launch gate
- [x] **Legal & privacy readiness plan** — Slice 10: [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md); not legal advice
- [x] **Legal placeholder routes & footer** — Slice 11: `/legal/terms`, `/legal/privacy`, `/legal/consent`, `/legal/cookies`; draft text only
- [x] **Frontend consent checkboxes** — Slice 12: registration, public booking, public order/request
- [x] **Backend consent enforcement** — Slice 13: `legal_consent_accepted` required on register, public booking, public order APIs
- [ ] **Backend consent audit/storage (booking/order)** — future slice
- [ ] **Lawyer-reviewed legal text** — replace placeholders before public launch
- [ ] **Real VPS provisioned** — not done yet
- [ ] **Domain + HTTPS** — reverse proxy configured on server

## Security

- [ ] **Security readiness reviewed** — [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) and [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- [ ] **CodeQL alerts reviewed** — GitHub **Security → Code scanning** after merge to `main` (`.github/workflows/codeql.yml`)
- [x] **Dependency advisories triaged** — [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md) §I–M; Slices 5–8 cleared npm/pip; **Dependency scan** blocking
- [x] **Trivy baseline** — [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md); Slice 11 non-root Docker hardening (DS-0002)
- [x] **Trivy blocking** — Slice 12: `.github/workflows/trivy.yml` fails on HIGH/CRITICAL; separate from CodeQL and dependency-scan
- [x] **Gitleaks secrets scan** — Slice 13: `.github/workflows/gitleaks.yml` (blocking); [SECRETS_SCAN_REPORT.md](./SECRETS_SCAN_REPORT.md); no secrets in git
- [x] **OWASP ZAP readiness** — Slice 14: [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md); manual baseline checklist; not blocking; owned local/staging URLs only
- [x] **OWASP ZAP workflow** — Slice 15: `.github/workflows/zap-baseline.yml`; manual/non-blocking localhost baseline; unauthenticated public pages only
- [x] **ZAP baseline triage** — Slice 16: first run 0 FAIL / 6 WARN; [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) §G
- [x] **nginx security headers** — Slice 17: `server_tokens off`, CSP baseline, cache headers; [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) §H
- [x] **nginx CSP/cache refinement** — Slice 18: explicit CSP directives, HTML no-store, assets immutable; [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) §I
- [x] **ZAP final CSP/cache triage** — Slice 19: `style-src` without `unsafe-inline`; cache/comments triaged; [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) §J
- [x] **passlib/bcrypt warning cleanup** — Slice 20: `bcrypt<4.1.0` compatibility pin; [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md) §O
- [x] **password_hash logging hygiene** — Slice 21: SQL echo disabled for scripts; seed logs do not expose auth hashes
- [ ] **Security config audit** — `docker compose exec api python scripts/check_security_readiness.py` (with production `.env` on staging)
- [ ] **Production env validated** — `python scripts/check_production_env.py --env-file .env --strict` exits 0 on the server (template `--strict` on `.env.production.example` is expected to fail until secrets are set)
- [ ] **JWT_SECRET_KEY** is a long random value (≥ 32 bytes), not `change_me`
- [ ] **Postgres password** is strong and matches `DATABASE_URL` in `.env`
- [ ] **`.env` is not in git** and file permissions are restrictive (`chmod 600 .env`)
- [ ] **HTTPS enabled** on public domain (reverse proxy / Cloudflare)
- [ ] **Demo credentials removed** — `seed_demo.py` blocked when `APP_ENV=production`; unique admin passwords on public prod
- [ ] **Admin and superadmin accounts** reviewed — unique emails, strong passwords, least privilege
- [ ] **CORS_ORIGINS** lists only your real frontend origin(s), not `*` or `localhost` (except local smoke)
- [ ] **API_DOCS_ENABLED=false** in production `.env` (OpenAPI UI off)
- [ ] **Public `/docs` decision** — confirm `/docs`, `/redoc`, `/openapi.json` return 404 when disabled
- [ ] **Firewall** — only 80/443 (and SSH) public; block direct `:8000` / `:5173` if proxied
- [ ] **SSH** — key-based auth, non-root deploy user where possible
- [ ] **Docker images** rebuilt after dependency updates

---

## Operations

- [ ] **Backups configured** — daily schedule per [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) on VPS (not active until server setup)
- [ ] **Restore drill completed** — [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) on isolated staging clone before public launch
- [ ] **Backup restore tested** at least once on a non-production clone
- [ ] **Monitoring configured** — [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md); uptime + log review on VPS before public launch
- [ ] **Logs reviewed** — `docker compose logs api web` after deploy; no secrets in shared logs
- [ ] **Health check** — `/health` returns OK (via proxy and/or direct)
- [ ] **Restart policy** — `restart: unless-stopped` on postgres, api, web
- [ ] **Disk space** — monitor volume growth (`docker system df`, host disk)
- [ ] **Update procedure documented** — git pull, build, migrate (see [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) §H)
- [ ] **Rollback plan** — previous git tag + backup restore path understood
- [ ] **Timezone** — `TZ` set consistently for support and booking display

---

## Application (functional)

- [ ] **At least one business** active and visible on public URL
- [ ] **Services configured** — booking and/or order types, prices, descriptions
- [ ] **Schedule configured** — working hours / breaks if using bookings
- [ ] **Public booking flow** tested end-to-end (guest or client)
- [ ] **Public order flow** tested end-to-end
- [ ] **Admin booking flow** — list, confirm, cancel/reschedule as applicable
- [ ] **Admin order flow** — accept, message, complete/decline
- [ ] **Client area** — logged-in client sees bookings/orders at `/me/*`
- [ ] **Superadmin** — platform overview accessible only to superadmin role
- [ ] **Frontend SPA routes** — hard refresh on `/login`, `/admin`, `/b/<slug>` works (nginx fallback)
- [ ] **Nginx security headers** — verify `X-Content-Type-Options`, `X-Frame-Options`, CSP, `server_tokens off` on frontend responses

---

## CI / quality (pre-release)

- [ ] GitHub Actions **backend-tests** green
- [ ] GitHub Actions **frontend-tests** green
- [ ] Local or staging: `pytest`, `check_backend.py`, `check_email_verification.py`, `check_password_reset.py`, `check_email_notifications.py`, `e2e_backend_audit.py`
- [ ] Frontend: `npm run test`, `typecheck`, `build`, `check:routes`

---

## Future (not in MVP — track separately)

- [ ] **Payments** (Stripe) — checkout session + webhook + admin checkout + result pages (Slices 6–10); `STRIPE_ENABLED=false` by default; test setup: [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md); run `scripts/check_billing_flow.py` before go-live; billing portal/refunds/downgrades not implemented — see [BILLING_READINESS_REPORT.md](./BILLING_READINESS_REPORT.md)
- [ ] **Email notifications** — foundation + event wiring implemented; dry-run audit: `docker compose exec api python scripts/check_email_notifications.py` (no real emails); live SMTP smoke: `docker compose exec api python scripts/send_test_email.py --to your-email@example.com` (one explicit recipient only, after VPS `.env` configured); enable live SMTP with `EMAIL_ENABLED` + SMTP on VPS
- [ ] **Email verification** — backend + frontend wired; enforcement ready but **disabled by default** (`REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=false`); dry-run audit: `docker compose exec api python scripts/check_email_verification.py`; before enabling enforcement: live SMTP + `send_test_email.py`, verified admin accounts, set `EMAIL_VERIFICATION_BASE_URL` on VPS; OAuth/social login not implemented
- [ ] **Password reset** — backend + frontend wired (`/forgot-password`, `/reset-password`); no account enumeration (request always returns `{ "sent": true }`); dry-run audit: `docker compose exec api python scripts/check_password_reset.py`; real delivery requires SMTP + `PASSWORD_RESET_BASE_URL` on VPS
- [ ] **Domain email** (SPF/DKIM for transactional mail)
- [ ] **Monitoring / alerting** (uptime, error tracking, log aggregation)
- [ ] **Automated backups** to object storage
- [ ] **Playwright or smoke tests** against staging URL in CI
- [ ] **Service worker / offline** — intentionally deferred
- [ ] **Mobile wrapper** — intentionally deferred

---

## Quick post-deploy smoke (5 minutes)

1. Open homepage and one public business page
2. Log in as owner → open `/admin` dashboard
3. Log in as client → open `/me/orders` or `/me/bookings`
4. `curl https://your-domain/health`
5. Confirm backup job ran in last 24h

Sign-off:

| Role | Name | Date |
|------|------|------|
| Deploy | | |
| Review | | |
