# Security Checklist

Practical pre-deployment checklist. See [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) for context and tool roadmap.

---

## Local checks (developer machine)

- [ ] `.env` is gitignored and never committed
- [ ] `python -m compileall api` passes
- [ ] `docker compose exec api python -m pytest` passes
- [ ] `docker compose exec api python scripts/check_backend.py` passes
- [ ] `docker compose exec api python scripts/check_security_readiness.py` passes (or WARN in local env)
- [ ] `docker compose exec api python scripts/check_billing_flow.py` passes
- [ ] `cd web && npm run test && npm run typecheck && npm run build && npm run check:routes`
- [ ] `cd web && npm run security:audit` — review high+ advisories (optional; may fail on dev deps; see [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md))

---

## CI checks (GitHub Actions)

- [ ] `backend-tests` job green on `main`
- [ ] `frontend-tests` job green on `main`
- [ ] `check_production_env.py` validates `.env.production.example`
- [ ] `docker-compose.prod.yml config` succeeds in CI

### CI security scanning

- [x] **CodeQL analysis** — `.github/workflows/codeql.yml` on push/PR to `main` + weekly Sunday; review **Security → Code scanning**
- [x] **Dependency audit baseline** — [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md); `npm run security:audit`, `pip-audit`; **blocking** `.github/workflows/dependency-scan.yml` (Slice 8)
- [x] **Dependency advisories triaged** — [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md) §I; upgrades planned Slices 5–8; no auto-fix in Slice 4
- [x] **pytest test-only upgrade** — Slice 5: `pytest>=9.0.3,<10.0.0`; pip-audit pytest CVE cleared
- [x] **Starlette/FastAPI runtime upgrade** (Slice 6) — `fastapi>=0.136.3,<0.139.0`; starlette 1.3.1; pip-audit backend clean
- [x] **Vite/esbuild upgrade** (Slice 7) — `vite@8.1.2`, `@vitejs/plugin-react@6.0.3`; npm audit clean

### Future CI (not blocking merges yet)
- [x] Promote dependency scan to **blocking** — Slice 8: `dependency-scan.yml` without `continue-on-error`; npm + pip baseline clean
- [x] **Trivy baseline** — Slice 9: `.github/workflows/trivy.yml` (fs + config + prod images); [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md)
- [x] **Docker non-root hardening** — Slice 11: `USER appuser` / `USER nginx`; web internal port 8080; DS-0002 resolved
- [x] Promote Trivy to **blocking** — Slice 12: `trivy.yml` without `continue-on-error`; HIGH/CRITICAL fails workflow
- [ ] gitleaks or GitHub secret scanning alerts reviewed
- [ ] OWASP ZAP baseline against staging URL

---

## Pre-production checks (before VPS go-live)

- [ ] `python scripts/check_production_env.py --env-file .env --strict` exits 0
- [ ] `APP_ENV=production` in production `.env`
- [ ] `JWT_SECRET_KEY` ≥ 32 chars, not a placeholder
- [ ] `CORS_ORIGINS` = exact HTTPS origin(s), no `*`, no stray localhost
- [ ] `API_DOCS_ENABLED=false`
- [ ] `POSTGRES_PASSWORD` strong; matches `DATABASE_URL`
- [ ] `docker-compose.prod.yml` used (no dev bind mounts, no uvicorn `--reload`)
- [ ] Postgres port **not** published to host/internet
- [ ] HTTPS enabled on public domain
- [ ] Firewall: only 80/443 (+ SSH) public
- [ ] Demo seed **not** run on production (or all demo passwords changed immediately)
- [ ] Admin/superadmin accounts use unique emails and strong passwords
- [ ] Backup script scheduled; restore tested once on clone ([BACKUP_RESTORE.md](./BACKUP_RESTORE.md))
- [ ] [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) reviewed end-to-end

---

## Stripe / payment checks

- [ ] `STRIPE_ENABLED=false` until staging test complete
- [ ] Test mode validated per [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md)
- [ ] Live keys only on server secrets store — never in git
- [ ] Webhook URL uses HTTPS in production dashboard
- [ ] `check_billing_readiness.py` and `check_billing_flow.py` pass before enabling Stripe

---

## Email checks

- [ ] `EMAIL_ENABLED=false` until SMTP verified
- [ ] Test email send from staging before `EMAIL_DRY_RUN=false`
- [ ] `check_email_notifications.py`, `check_email_verification.py`, `check_password_reset.py` pass
- [ ] Verification/reset base URLs use production HTTPS domain

---

## Legal / privacy checks (future — not implemented)

- [ ] Terms of Service / user agreement drafted and linked
- [ ] Privacy Policy drafted and linked
- [ ] Consent for personal data processing (registration, etc.)
- [ ] Cookie / storage notice if non-essential tracking added
- [ ] 152-FZ review if launching for Russian users or storing RU personal data

---

## Manual auth / role smoke (staging or post-deploy)

- [ ] Guest → `/admin` blocked
- [ ] Client → `/admin` blocked
- [ ] Owner → `/superadmin` blocked
- [ ] Cross-business API access blocked
- [ ] Stripe webhook rejects bad signature
- [ ] Checkout requires owner/admin auth
- [ ] Password reset does not reveal account existence
- [ ] Guest claim returns generic error on mismatch

---

## Future scanner checks (own infrastructure only)

- [x] CodeQL — workflow runs on push/PR/schedule; triage alerts in GitHub Security tab
- [x] Dependency audit baseline — `npm run security:audit`, `pip-audit`; **blocking** [dependency-scan workflow](./.github/workflows/dependency-scan.yml) (Slice 8)
- [x] Dependency audits — baseline clean; blocking scan enabled (Slices 5–8)
- [x] Trivy baseline — [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) §G–I (Slices 10–12)
- [x] Trivy blocking — Slice 12; future HIGH/CRITICAL findings fail workflow
- [ ] OWASP ZAP baseline — review findings on staging
- [ ] Nuclei — optional, staging only, low rate, templates reviewed first
- [ ] TestSprite — regression QA; security findings triaged separately

**Never** run aggressive scanners or Nuclei against third-party sites.
