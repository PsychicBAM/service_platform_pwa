# Production checklist

Use this before and after deploying to a VPS. Not every item applies to a private demo server — mark N/A where appropriate.

Related: [DEPLOYMENT.md](./DEPLOYMENT.md), [BACKUP_RESTORE.md](./BACKUP_RESTORE.md), [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md), [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md), [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md)

---

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
- [ ] **Security config audit** — `docker compose exec api python scripts/check_security_readiness.py` (with production `.env` on staging)
- [ ] **Production env validated** — `python scripts/check_production_env.py --env-file .env --strict` exits 0
- [ ] **JWT_SECRET_KEY** is a long random value (≥ 32 bytes), not `change_me`
- [ ] **Postgres password** is strong and matches `DATABASE_URL` in `.env`
- [ ] **`.env` is not in git** and file permissions are restrictive (`chmod 600 .env`)
- [ ] **HTTPS enabled** on public domain (reverse proxy / Cloudflare)
- [ ] **Demo credentials removed** — do not run `seed_demo.py` on real production, or change all demo passwords immediately
- [ ] **Admin and superadmin accounts** reviewed — unique emails, strong passwords, least privilege
- [ ] **CORS_ORIGINS** lists only your real frontend origin(s), not `*` or `localhost` (except local smoke)
- [ ] **API_DOCS_ENABLED=false** in production `.env` (OpenAPI UI off)
- [ ] **Public `/docs` decision** — confirm `/docs`, `/redoc`, `/openapi.json` return 404 when disabled
- [ ] **Firewall** — only 80/443 (and SSH) public; block direct `:8000` / `:5173` if proxied
- [ ] **SSH** — key-based auth, non-root deploy user where possible
- [ ] **Docker images** rebuilt after dependency updates

---

## Operations

- [ ] **Backups configured** — daily `pg_dump` per [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)
- [ ] **Backup restore tested** at least once on a non-production clone
- [ ] **Logs reviewed** — `docker compose logs api web` after deploy
- [ ] **Health check** — `/health` returns OK (via proxy and/or direct)
- [ ] **Restart policy** — `restart: unless-stopped` on postgres, api, web
- [ ] **Disk space** — monitor volume growth (`docker system df`, host disk)
- [ ] **Update procedure documented** — git pull, build, migrate (see [DEPLOYMENT.md](./DEPLOYMENT.md))
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
