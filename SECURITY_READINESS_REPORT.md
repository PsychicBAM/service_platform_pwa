# Security Readiness Report — Phase 6 (Slice 1)

**Purpose:** Defensive security baseline before VPS/production deployment.  
**Scope:** Document what is protected today, what is still missing, and which tools to add later.  
**Not in scope:** Offensive pentesting, aggressive scanners, exploit code, or legal document creation.

Related: [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) · [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md)

---

## A. Current defensive status

| Area | Status |
|------|--------|
| **Auth / JWT** | Login issues access + refresh tokens; `JWT_SECRET_KEY` configurable; tokens verified on protected routes |
| **Role guards** | `client`, `business_admin` / owner, `superadmin` enforced in API dependencies and frontend `AdminGuard` / `SuperadminGuard` |
| **Business access** | Business-scoped routes require membership; cross-tenant access blocked in services and tests |
| **Email verification** | Optional; `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN` can block unverified login |
| **Password reset** | Tokens stored as SHA-256 hash only; generic errors for invalid tokens; request endpoint does not confirm account existence |
| **Stripe webhook** | `POST /api/v1/billing/stripe/webhook` verifies Stripe signature; invalid signature → `STRIPE_WEBHOOK_SIGNATURE_INVALID` |
| **Checkout access** | `POST .../billing/checkout-session` requires authenticated business admin/owner |
| **Production env validation** | `scripts/check_production_env.py --strict` — JWT, CORS, docs, DB, SQL echo, public URLs, Stripe, SMTP; static message codes only (Slice 2) |
| **VPS deployment runbook** | [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) — operator guide (Slice 3); no live deploy yet |
| **API docs** | OpenAPI UI enabled in `local`/`dev` by default; disabled in `staging`/`production` unless `API_DOCS_ENABLED=true` |
| **CORS production safety** | `APP_ENV=production` rejects empty origins and wildcard `*` at settings load |
| **Nginx security headers** | Slices 17–19: CSP baseline, cache refinement, `style-src 'self'` without `unsafe-inline` in `web/nginx.conf` |
| **Docker production compose** | `docker-compose.prod.yml` — no bind mounts, no `--reload`, API not published publicly, Postgres not port-mapped |
| **Backup / restore docs** | [BACKUP_RESTORE.md](./BACKUP_RESTORE.md), [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) |
| **Guest claim** | Mismatched email/phone returns generic `CLAIM_NOT_FOUND_OR_MISMATCH` (no leak of which field failed) |
| **Password hashing** | bcrypt via `passlib` `CryptContext`; Slice 20 pinned `bcrypt<4.1.0`; Slice 21 disabled SQL echo logging of `password_hash` |
| **CI** | GitHub Actions — pytest, `check_backend.py`, migrations, production env template validation |

Optional local audit (no scanners):

```bash
docker compose exec api python scripts/check_security_readiness.py
```

---

## B. Known security gaps / not yet done

| Gap | Notes |
|-----|--------|
| **CodeQL workflow** | ✅ `.github/workflows/codeql.yml` — Python + JavaScript/TypeScript; static analysis only |
| **Dependency scan baseline** | ✅ [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md) — `npm run security:audit`, `pip-audit`; **blocking** `.github/workflows/dependency-scan.yml` (Slice 8) |
| **Dependency advisory triage** | ✅ Phase 6 Slice 4 — advisories classified; upgrade plan in DEPENDENCY_SECURITY_REPORT §I; **no version bumps yet** |
| **pytest test-only upgrade** | ✅ Phase 6 Slice 5 — pytest ≥9.0.3, pytest-asyncio ≥1.3; CVE-2025-71176 cleared |
| **Starlette/FastAPI runtime upgrade** | ✅ Phase 6 Slice 6 — `fastapi>=0.136.3,<0.139.0` → starlette 1.3.1; pip-audit backend clean |
| **Vite/esbuild upgrade** | ✅ Phase 6 Slice 7 — `vite@8.1.2`, `@vitejs/plugin-react@6.0.3`; npm audit clean |
| **Dependency scan in blocking CI** | ✅ Phase 6 Slice 8 — `dependency-scan.yml` fails on advisories; baseline clean (npm + pip) |
| **Trivy baseline** | ✅ Phase 6 Slice 9 — [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md); `.github/workflows/trivy.yml` |
| **Trivy triage (Slice 10)** | ✅ CVE/fs/image baseline clean; DS-0002 documented — see §G |
| **Docker non-root (Slice 11)** | ✅ `appuser` / `nginx` USER; web internal port **8080**; DS-0002 resolved locally |
| **Trivy blocking (Slice 12)** | ✅ `trivy.yml` without `continue-on-error`; HIGH/CRITICAL findings fail workflow |
| **Gitleaks secrets scan (Slice 13)** | ✅ `.github/workflows/gitleaks.yml` — blocking; [SECRETS_SCAN_REPORT.md](./SECRETS_SCAN_REPORT.md) |
| **OWASP ZAP baseline** | ✅ Slice 19 — final CSP/cache triage; `unsafe-inline` removed; [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) §G–J |
| **Rate limiting** | Not implemented on auth or public endpoints |
| **Content-Security-Policy** | ✅ Slices 17–19 — `style-src 'self'` only (no `unsafe-inline`); COEP/HSTS still deferred |
| **Monitoring / alerting** | [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) — plan documented; configure on VPS before launch |
| **Automated backups** | [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) — schedule/retention documented; not active until VPS setup |
| **Legal / privacy / consent pages** | ⏳ Placeholder routes `/legal/*` (Slice 11); consent enforcement + audit storage (Slices 12–15); read APIs + UI (Slices 17–19B); retention/deletion/export **design** (Slice 20); lawyer-reviewed text + operational flows still required |
| **Production VPS** | Not deployed — local/Docker dev only |
| **WAF / DDoS** | Rely on host/provider when deployed |
| **HSTS** | Set at reverse proxy when HTTPS is live |
| **Playwright in CI** | E2E browser tests run locally/manual |

---

## C. Pre-VPS security checklist

Complete before pointing a real domain at the stack:

- [ ] **`.env` production secrets** — all placeholders replaced; file not in git (`chmod 600`)
- [ ] **`JWT_SECRET_KEY`** — ≥ 32 characters, cryptographically random, not `change_me`
- [ ] **`CORS_ORIGINS`** — exact HTTPS frontend origin(s); not `*`; not leftover `localhost` in production
- [ ] **`API_DOCS_ENABLED=false`** — confirm `/docs`, `/redoc`, `/openapi.json` return 404
- [ ] **`APP_ENV=production`** — triggers CORS validation at startup
- [ ] **`EMAIL_ENABLED`** — only after SMTP test; `EMAIL_DRY_RUN=false` only when sending is verified; run `check_email_readiness.py` first (no real send)
- [ ] **`STRIPE_ENABLED`** — only after [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) test-mode stages pass on staging (test keys only); local dev: [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md)
- [ ] **HTTPS + domain** — TLS certificate valid; HTTP redirects to HTTPS
- [ ] **Backup / restore tested** — restore drill on staging clone per [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) (not performed yet)
- [ ] **Demo credentials** — do not run `seed_demo.py` on production (`APP_ENV=production` blocked); replace demo emails/passwords before public launch
- [ ] **Database not public** — use `docker-compose.prod.yml` (Postgres has no `ports:`); firewall blocks `:5433` / `:5432` from internet
- [ ] **API not exposed** — only nginx `web` on 80/443; block direct `:8000` if accidentally published
- [ ] **Docker volumes** — understand `service_platform_postgres_prod_data`; include in backup plan
- [ ] **Logs** — confirm scripts and startup do not print secrets (audit scripts use `configured` / `not set` only)
- [ ] **Run validators:**
  ```bash
  python scripts/check_production_env.py --env-file .env --strict
  docker compose exec api python scripts/check_security_readiness.py
  docker compose exec api python scripts/check_backend.py
  ```

---

## D. Recommended security tools roadmap

Ordered for this project (own staging/VPS only — never scan third-party sites):

1. **CodeQL** — ✅ Phase 6 Slice 2 — `.github/workflows/codeql.yml` (`python`, `javascript-typescript`, `build-mode: none`); review alerts in GitHub **Security → Code scanning**
2. **Dependency audit baseline** — ✅ Phase 6 Slice 3 — [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md); **blocking** since Slice 8
3. **Dependency advisory triage** — ✅ Phase 6 Slice 4 — risk table + upgrade roadmap (Slices 5–8); advisories cleared
4. **Blocking dependency CI** — ✅ Slice 8 — `dependency-scan.yml` blocking; baseline clean
5. **Trivy** — ✅ Slice 9 — fs/config + prod Docker images; ✅ Slice 10 triage — [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) §G; ✅ Slice 12 **blocking**
7. **Gitleaks secrets scan** — ✅ Slice 13 — `.github/workflows/gitleaks.yml` (blocking); [SECRETS_SCAN_REPORT.md](./SECRETS_SCAN_REPORT.md)
8. **OWASP ZAP baseline workflow** — ✅ Slice 15 — `.github/workflows/zap-baseline.yml`; `workflow_dispatch` only; non-blocking; local Docker app only; unauthenticated/public pages only
9. **OWASP ZAP staging baseline** — after VPS, scan **our** HTTPS staging URL first
10. **Nuclei** — only later, carefully, against **own** staging; not a substitute for ZAP baseline
11. **TestSprite** — additional QA/regression coverage; not sole security scanner
12. **Manual auth/role checklist** — §E below each release

---

## E. Manual auth / role security smoke checklist

Run after deploy or major auth changes (browser + API):

- [ ] Unauthenticated user cannot access `/admin` (redirected to login)
- [ ] **Client** cannot access `/admin` (blocked by guard)
- [ ] **Owner** cannot access `/superadmin` (blocked by guard)
- [ ] **Client** cannot list or mutate another business's bookings/orders via API
- [ ] **Business owner** cannot `GET`/`PATCH` another `business_id` (403/404)
- [ ] **Webhook** without valid Stripe signature returns 400 (`STRIPE_WEBHOOK_SIGNATURE_INVALID`)
- [ ] **Checkout session** without Bearer token returns 401
- [ ] **Checkout session** as client (non-admin) for a business returns 403
- [ ] **Password reset request** returns same success message for unknown vs known email
- [ ] **Guest claim** with wrong email/phone returns generic mismatch error (no field-specific leak)
- [ ] **Superadmin** actions write audit logs for manual plan changes

Automated coverage exists in pytest for many of these; manual pass confirms routing + UI guards.

---

## F. Legal / privacy readiness (Slice 10)

Full plan: [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) — data categories, required documents, consent UI locations, 152-FZ/GDPR planning notes, implementation roadmap.

**This is not legal advice.** Final Terms, Privacy Policy, and consent flows require qualified legal review before public launch. This slice does **not** create legal documents or consent UI.

---

### Phase 6 Slice 2 — CodeQL (summary)

- Workflow: `.github/workflows/codeql.yml` — separate from `ci.yml`
- Scans: `api/` (Python), `web/` (JavaScript/TypeScript)
- **Static** source analysis — not dynamic web scanning
- Does **not** replace OWASP ZAP, Trivy, dependency audits, or manual auth/tenant review

### Phase 6 Slice 3 — Dependency security baseline (summary)

- Report: [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md)
- Frontend: `cd web && npm run security:audit` (`npm audit --audit-level=high`)
- Backend: `pip-audit -r api/requirements.txt` (install `pip-audit` in disposable env only)
- Workflow: `.github/workflows/dependency-scan.yml` — `workflow_dispatch` + weekly; **blocking** (Slice 8; no `continue-on-error`)
- **Not** in blocking `ci.yml` until baseline is clean
- CodeQL = source patterns; dependency audit = known CVEs in packages — both needed

### Phase 6 Slice 4 — Dependency advisory triage (summary)

- [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md) §I — classified npm/pip-audit findings
- **Starlette** (runtime): ✅ **Slice 6 done** — fastapi 0.138.2 / starlette 1.3.1; pip-audit clean
- **pytest** (test-only): ✅ **Slice 5 done** — CVE-2025-71176 cleared
- **Vite/esbuild** (dev server): ✅ **Slice 7 done** — Vite 8.1.2; npm audit clean
- No dependency versions changed in Slice 4; **Slice 5** upgraded test deps only (pytest)

### Phase 6 Slice 5 — pytest upgrade (summary)

- `api/requirements.txt`: `pytest>=9.0.3,<10.0.0`, `pytest-asyncio>=1.3.0,<2.0.0` (asyncio bump required for pytest 9)
- CVE-2025-71176 cleared in pip-audit
### Phase 6 Slice 6 — Starlette / FastAPI upgrade (summary)

- `api/requirements.txt`: `fastapi>=0.136.3,<0.139.0` (was `>=0.115.0,<0.116.0`); starlette 1.3.1 transitive
- All 8 Starlette pip-audit advisories cleared
- Full backend + frontend regression passed; no app code changes

### Phase 6 Slice 7 — Vite / esbuild upgrade (summary)

- `web/package.json`: `vite@8.1.2`, `@vitejs/plugin-react@6.0.3` (was Vite 5.4.21 / plugin-react 4.7.0)
- GHSA-67mh-4wv8-2f99 cleared; `npm run security:audit` → 0 vulnerabilities
- No vite/vitest/playwright config or app source changes
- Full frontend + backend regression passed

### Phase 6 Slice 9 — Trivy baseline (summary)

- Workflow: `.github/workflows/trivy.yml` — `workflow_dispatch` + weekly; **blocking** (Slice 12; no `continue-on-error`)
- Scans: filesystem, config (Docker/Compose), production `api` + `web` images from `docker-compose.prod.yml`
- Report: [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md)
- **Not** a pentest; **not** OWASP ZAP/Nuclei; separate from CodeQL and dependency-scan
- Local (optional, if Trivy installed):
  ```bash
  trivy fs --severity HIGH,CRITICAL --ignore-unfixed .
  trivy config --severity HIGH,CRITICAL --ignore-unfixed .
  docker compose -p svcplat -f docker-compose.prod.yml build api web
  trivy image --severity HIGH,CRITICAL --ignore-unfixed svcplat-api:latest svcplat-web:latest
  ```

### Phase 6 Slice 11 — Docker non-root hardening (summary)

- `api/Dockerfile`: `USER appuser` (uid 1000)
- `web/Dockerfile` + `nginx.conf`: `USER nginx`, listen **8080**; compose maps `5173:8080` / `${WEB_HTTP_PORT}:8080`
- Local Trivy config: DS-0002 **resolved** — see [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) §H

### Phase 6 Slice 12 — Trivy promoted to blocking (summary)

- Removed `continue-on-error: true` from `trivy-fs-config` and `trivy-docker-images`
- Baseline clean: fs, config (DS-0002 cleared), prod api/web images — see [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) §I
- Future HIGH/CRITICAL Trivy findings fail the workflow
- CodeQL and dependency-scan remain separate workflows
- OWASP ZAP, Nuclei, legal pages — future work

### Phase 6 Slice 13 — Gitleaks secrets scan baseline (summary)

- Workflow: `.github/workflows/gitleaks.yml` — `gitleaks/gitleaks-action@v2`, `fetch-depth: 0`, blocking
- Triggers: push/PR to `main`, `workflow_dispatch`, weekly Sunday 04:00 UTC
- Permissions: `contents: read`, `pull-requests: write` (PR comments); no SARIF upload
- Config: `.gitleaks.toml` — cache/build paths; narrow historical false-positive regex allowlist (no `.env` allowlist)
- Placeholder fixes: `README_BACKEND.md` curl tokens; production env test JWT/Stripe strings → safe placeholders
- Report: [SECRETS_SCAN_REPORT.md](./SECRETS_SCAN_REPORT.md) — incident response if a secret is found
- **No secrets should ever be committed** — `.env` stays local/gitignored
- Does not replace CodeQL, dependency-scan, Trivy, runtime secret management, or rotation

### Phase 6 Slice 14 — OWASP ZAP baseline readiness (summary)

- Report: [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) — safe local manual baseline flow, triage policy, future CI plan
- **Dynamic web** scanning (HTTP responses); separate from CodeQL, dependency-scan, Trivy, Gitleaks
- **Not in blocking CI** — no workflow in Slice 14; no external target scanned
- **Owned URLs only** — `localhost` Docker app now; HTTPS staging after VPS
- **Passive / baseline only** — no aggressive scan, no authenticated admin pages in this slice
- Nuclei and legal pages — future work

---

### Phase 6 Slice 15 — OWASP ZAP baseline workflow (summary)

- Workflow: `.github/workflows/zap-baseline.yml` — `zaproxy/action-baseline@v0.15.0`
- Trigger: `workflow_dispatch` only (manual)
- Behavior: `continue-on-error: true` (non-blocking baseline)
- Scope: local Docker app `http://localhost:5173` only; health checks run before scan
- Safety: no authenticated/admin scans, no full scan, no third-party targets
- Artifacts: baseline HTML/JSON/MD reports uploaded when produced

### Phase 6 Slice 16 — ZAP baseline triage and artifact fix (summary)

- First manual baseline: **0 FAIL-NEW**, **6 WARN-NEW**, **61 PASS** on `http://localhost:5173`
- Findings triaged in [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) §G (CSP/cache/COEP deferred; SPA informational accepted)
- Workflow fix: action default `report_*` files; upload `if-no-files-found: warn`
- ZAP remains manual, non-blocking

### Phase 6 Slice 17 — nginx security headers baseline (summary)

- `web/nginx.conf`: `server_tokens off`, conservative CSP, cache headers (HTML `no-cache`, `/assets/` long cache)
- COEP/COOP/CORP and HSTS intentionally not added (localhost HTTP / breakage risk)
- ZAP 10027 (suspicious comments) triaged — likely false positive from minified route strings; not suppressed
- Validated: Docker header smoke, frontend tests, Playwright, full backend suite

### Phase 6 Slice 18 — CSP and cache header refinement (summary)

- CSP: added explicit `form-action`, `frame-src`, `child-src`, `worker-src`, `manifest-src`, `media-src`, `prefetch-src` (ZAP 10055)
- HTML/SPA: `no-store, no-cache, must-revalidate` + `Pragma` + `Expires: 0`
- `/assets/*`: `public, max-age=31536000, immutable`
- COEP/COOP/CORP and HSTS still deferred; 10027/10109 documented not suppressed/accepted

### Phase 6 Slice 19 — Final ZAP CSP/cache triage (summary)

- Removed `style-src 'unsafe-inline'` — app uses external Vite/Tailwind CSS only; Playwright + Docker smoke pass
- 10049 cache policy triaged: HTML no-store intentional; assets immutable; icons/manifest short cache
- 10027 suspicious comments: comment-free minified bundle; likely false positive; not suppressed
- ZAP remains manual, non-blocking

### Phase 6 Slice 20 — passlib/bcrypt warning cleanup (summary)

- Root cause: passlib 1.7.4 incompatible with bcrypt 4.1+ (`__about__` removed)
- Fix: pin `bcrypt>=4.0.1,<4.1.0` in `api/requirements.txt` — password hashing behavior unchanged
- Added `api/tests/test_password_service.py`; 573 pytest tests pass; pip-audit clean

### Phase 6 Slice 21 — password_hash logging hygiene (summary)

- Root cause: `database.py` had `echo=settings.app_env == "local"`, logging SQL bind params including `password_hash`
- Fix: `sqlalchemy_echo` setting (default `false`); `seed_demo.py` forces `SQLALCHEMY_ECHO=false` and disables engine echo
- Added `api/tests/test_sensitive_logging.py`; seed_demo output has no `password_hash` or bcrypt prefixes

### Phase 7 Slice 1 — VPS production readiness plan (summary)

- [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) — deployment plan, env checklist, smoke tests, blockers
- No live VPS deployment in this slice; legal/privacy pages still required before public launch

### Phase 7 Slice 2 — Production env strict validation polish (summary)

- [`.env.production.example`](./.env.production.example) — template only; obviously fake placeholders (`CHANGE_ME`, `sk_test_REDACTED` in comments)
- `scripts/check_production_env.py --strict` — fails on unsafe production config; never prints secret values
- Run `--strict` on server `.env` before VPS launch; `--strict` on the example file is expected to fail until secrets are set on the server

### Phase 7 Slice 3 — VPS deployment runbook (summary)

- [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) — server prep, folder layout, first deploy, HTTPS plan, smoke tests, backup/rollback, logs
- Documentation only — **no real VPS deployment** in this slice
- Legal/privacy/consent pages still required before public launch

### Phase 7 Slice 4 — PostgreSQL backup/restore baseline (summary)

- [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) — principles, pre-update checklist, restore test checklist, future automation plan
- Optional: `scripts/backup_postgres.sh`, `scripts/restore_postgres.sh` (VPS/bash; static status only; no password output)
- **Automated backup schedule** — documented in [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md); configure on VPS only
- Restore drill on staging clone required before public launch

### Phase 7 Slice 5 — Backup script smoke tests (summary)

- `api/tests/test_backup_scripts.py` — `--help`, argument validation, default backup dir outside repo; no real `pg_dump`/restore
- `restore_postgres.sh` requires `--confirm-destructive` before any restore attempt
- Shellcheck not in CI — optional local improvement

### Phase 7 Slice 6 — Restore drill checklist (summary)

- [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) — staging restore drill plan, pre/post checklists, failure handling
- **No real restore performed** in this slice
- Real drill on isolated staging/VPS clone still required before public launch
- Backup automation (cron, off-server copy) — [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md); templates only; configure on VPS

### Phase 7 Slice 7 — Backup schedule & retention (summary)

- [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) — frequency, retention tiers, folder layout, cron/systemd templates, off-server copy, failure alerts, cleanup safety, launch gate
- **No cron/systemd job installed** in this slice — operators configure on VPS only
- Off-server backup copy remains planned until VPS setup

### Phase 7 Slice 8 — Monitoring & logging readiness (summary)

- [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) — what to monitor, manual VPS checks, health plan, log policy, alert plan, incident checklist
- **No live monitoring configured** — required before public launch; configure on VPS only
- Backup freshness monitoring — [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) §H; remains future VPS work

### Phase 7 Slice 9 — Demo credentials production safety gate (summary)

- `seed_demo.py` refuses when `APP_ENV=production` — fail closed, static message only
- `check_production_env.py --strict` fails on `ALLOW_DEMO_SEED_IN_PRODUCTION=true` or `DEMO_PASSWORD` in production
- Launch gate: `--strict` on server `.env` before public traffic; legal pages still required

### Phase 7 Slice 15 — Consent audit storage implementation (summary)

- `legal_consent_records` table (Alembic `0010`) — source, entity_type, entity_id, business_id, user_id, client_id, version, timestamps
- Writes after successful registration, public booking, and public order (same transaction)
- No IP/user-agent collected; API responses unchanged; **not legal compliance**

### Phase 7 Slice 16 — Consent records read/admin access design (summary)

- [CONSENT_RECORDS_ACCESS_PLAN.md](./CONSENT_RECORDS_ACCESS_PLAN.md) — access roles, data minimization, tenant isolation requirements
- Staged plan: Slice 17 superadmin read API → Slice 18 business admin API → Slice 19 UI
- Records remain **write-only**; no routes, UI, or migration in Slice 16; **not legal compliance**

### Phase 7 Slice 17 — Superadmin consent read API (summary)

- `GET /api/v1/superadmin/legal-consents` — superadmin auth via `require_superadmin`
- Filters: `source`, `entity_type`, `business_id`; pagination `page` + `limit` (default 25, max 100)
- Response: data-minimized summary fields + optional `business_name`; no form_data, tokens, or IP/user-agent
- **Not legal compliance**

### Phase 7 Slice 18 — Business admin consent read API (summary)

- `GET /api/v1/businesses/{business_id}/legal-consents` — `get_business_for_admin_or_403`
- Records always scoped to authorized `business_id`; cross-business access → `403`
- Same filters/pagination/response shape as Slice 17; tenant isolation tests in `test_business_legal_consents.py`
- **Not legal compliance**

### Phase 7 Slice 19A — Business admin consent UI (summary)

- `/admin/legal-consents` — read-only table for business owners/admins
- Calls business-scoped API only; filters (source, entity_type); pagination
- Displays summary fields only — no form_data, tokens, IP/user-agent, or legal text
- **Not legal compliance**

### Phase 7 Slice 19B — Superadmin consent UI (summary)

- `/superadmin/legal-consents` — platform-wide read-only table for superadmins
- Calls `GET /api/v1/superadmin/legal-consents`; filters (business_id, source, entity_type); pagination
- Summary fields only; no export endpoint; **not legal compliance**

### Phase 7 Slice 20 — Data retention/deletion/export design (summary)

- [DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md) — retention principles, deletion scenarios, export scope, consent record handling, backup caveat, security requirements
- **Design only** — no deletion/export API, UI, or migration; **not legal compliance**
- Future slices: export API (22), deletion design (23), anonymization (24), admin UI (25)

### Phase 8 Slice 1 — Email/SMTP readiness (summary)

- `scripts/check_email_readiness.py` — safe config audit; dry-run probe; static result codes; no real email by default
- `EMAIL_ENABLED=false` and `EMAIL_DRY_RUN=true` remain defaults; SMTP secrets never printed
- `--strict` fails incomplete live SMTP config; `--send-test` refused unless live send explicitly enabled

### Phase 8 Slice 2 — SMTP operator runbook (summary)

- [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) — staged VPS activation (disabled → dry-run → one live test → production), rollback, secret-safety rules, troubleshooting
- Live email activation is operator-controlled; dry-run must precede live mode; no secrets in repo; no compliance/deliverability guarantee

### Phase 8 Slice 3 — Stripe test mode operator runbook (summary)

- [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) — staged VPS test-mode activation (disabled → test config → test checkout → test webhook → rollback)
- `STRIPE_ENABLED=false` by default; test keys only for rollout; manual superadmin plan changes separate; no live payment activation claim; no compliance guarantee

**Last updated:** Phase 8 Slice 3 — Stripe test mode operator runbook (docs only).
