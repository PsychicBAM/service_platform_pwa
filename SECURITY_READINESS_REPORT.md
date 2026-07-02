# Security Readiness Report — Phase 6 (Slice 1)

**Purpose:** Defensive security baseline before VPS/production deployment.  
**Scope:** Document what is protected today, what is still missing, and which tools to add later.  
**Not in scope:** Offensive pentesting, aggressive scanners, exploit code, or legal document creation.

Related: [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md)

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
| **Production env validation** | `scripts/check_production_env.py --strict` checks JWT, CORS, docs, DB, Stripe, SMTP |
| **API docs** | OpenAPI UI enabled in `local`/`dev` by default; disabled in `staging`/`production` unless `API_DOCS_ENABLED=true` |
| **CORS production safety** | `APP_ENV=production` rejects empty origins and wildcard `*` at settings load |
| **Nginx security headers** | Slice 17: `server_tokens off`, CSP baseline, cache headers; plus `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` in `web/nginx.conf` |
| **Docker production compose** | `docker-compose.prod.yml` — no bind mounts, no `--reload`, API not published publicly, Postgres not port-mapped |
| **Backup / restore docs** | [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) — manual `pg_dump` / restore procedure |
| **Guest claim** | Mismatched email/phone returns generic `CLAIM_NOT_FOUND_OR_MISMATCH` (no leak of which field failed) |
| **Audit scripts** | Email, password reset, billing flow audits — no network, no secret printing |
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
| **OWASP ZAP baseline** | ✅ Slice 17 — nginx headers address 10036/10038/10049; first baseline 0 FAIL / 6 WARN; [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) §G–H |
| **Rate limiting** | Not implemented on auth or public endpoints |
| **Content-Security-Policy** | ✅ Slice 17 — conservative CSP in `web/nginx.conf`; COEP/HSTS still deferred |
| **Monitoring / alerting** | No uptime, error rate, or intrusion alerts configured |
| **Automated backups** | Documented manually only — no cron / object-storage automation in repo |
| **Legal / privacy / consent pages** | Terms, Privacy Policy, consent flows not implemented |
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
- [ ] **`EMAIL_ENABLED`** — only after SMTP test; `EMAIL_DRY_RUN=false` only when sending is verified
- [ ] **`STRIPE_ENABLED`** — only after [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) passes in staging
- [ ] **HTTPS + domain** — TLS certificate valid; HTTP redirects to HTTPS
- [ ] **Backup / restore tested** — at least one restore drill on a clone ([BACKUP_RESTORE.md](./BACKUP_RESTORE.md))
- [ ] **Demo credentials** — do not run `seed_demo.py` on production; change or remove `superadmin@example.com`, `owner@example.com`, `client@example.com`
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

## F. Legal / privacy future note

Before a public or Russia-facing launch, plan separate legal work (not this slice):

- **Terms of Service / user agreement** — platform rules, liability, acceptable use
- **Privacy Policy** — what data is collected, retention, processors, contact
- **Personal data processing consent** — explicit consent where required (e.g. registration, marketing)
- **Cookie / local storage notice** — if analytics or non-essential cookies are added
- **Russian Federal Law 152-FZ** — review localization, data residency, consent, and notification obligations before marketing to Russian users or storing data of Russian citizens

This slice does **not** create legal documents or consent UI.

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

---

**Last updated:** Phase 6 Slice 17 — nginx security headers baseline.
