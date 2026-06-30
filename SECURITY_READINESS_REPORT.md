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
| **Nginx security headers** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` in `web/nginx.conf` |
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
| **CodeQL workflow** | Not in CI yet — recommended for Python + JavaScript |
| **Dependency scan workflow** | No automated `npm audit` / `pip-audit` in CI |
| **Docker image scan** | No Trivy or similar in CI |
| **OWASP ZAP baseline** | No staging URL scan automated |
| **Secrets scan workflow** | No gitleaks / GitHub secret scanning config in repo |
| **Rate limiting** | Not implemented on auth or public endpoints |
| **Content-Security-Policy** | Deferred — validate against Vite bundle before enabling |
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

1. **CodeQL** — GitHub Actions code scanning for Python + TypeScript
2. **`npm audit` / dependency review** — frontend; fail CI on high/critical or use Dependabot
3. **`pip-audit` or `safety`** — Python dependencies in CI
4. **Trivy** — scan Docker images and filesystem (`api`, `web` builds)
5. **GitHub secret scanning / gitleaks** — optional pre-commit or CI for accidental key commits
6. **OWASP ZAP baseline** — passive scan against **your** staging URL after deploy
7. **Nuclei** — only later, carefully, against **own** staging; not a substitute for ZAP baseline
8. **TestSprite** — additional QA/regression coverage; not sole security scanner
9. **Manual auth/role checklist** — §E below each release

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

**Last updated:** Phase 6 Slice 1 — security readiness baseline (documentation + optional audit script).
