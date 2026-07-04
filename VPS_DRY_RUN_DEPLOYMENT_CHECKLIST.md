# VPS Dry-Run Deployment Checklist

Step-by-step operator checklist for deploying the Service Platform to a VPS **before public launch**. Use this as a **dry run** — validate infrastructure, containers, HTTPS, backups, and smoke flows without enabling live email or live Stripe unless you explicitly follow the separate operator runbooks.

**Related runbooks:** [VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md](./VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md) · [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) · [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) · [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) · [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

---

## A. Purpose

| Principle | Detail |
|-----------|--------|
| **Dry-run before public launch** | Prove deploy, HTTPS, migrations, and core flows on VPS/staging — not a substitute for legal review |
| **No live Stripe/email required** | Safe defaults: `EMAIL_ENABLED=false`, `EMAIL_DRY_RUN=true`, `STRIPE_ENABLED=false` |
| **No secrets in repo** | Real passwords, keys, and `.env` files exist **only on the VPS** |
| **Operator-controlled** | Final go/no-go for public launch remains a **manual** business decision |

This checklist does **not** automate deployment, guarantee compliance, or enable live payments/email by itself.

---

## B. Pre-flight local checks

Complete on a trusted admin machine **before** touching the VPS.

- [ ] **Git status clean** — no uncommitted secrets or `.env` files staged
- [ ] **Latest main pulled** — record commit SHA for rollback: `git rev-parse HEAD`
- [ ] **CI green** — GitHub Actions backend + frontend workflows
- [ ] **CodeQL green** — no unreviewed critical alerts
- [ ] **dependency-scan green** — blocking workflow passes
- [ ] **Trivy green** — image/filesystem scan passes
- [ ] **Gitleaks green** — no secrets in repository history
- [ ] **OWASP ZAP** — baseline reviewed ([ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md)); re-run on staging HTTPS URL after VPS deploy when possible
- [ ] **Local tests (optional but recommended)** — `pytest`, `npm run test`, `npm run test:e2e` if validating the exact commit before deploy

---

## C. VPS directory layout

Use **placeholder paths** — adjust to your host policy. Do not commit VPS paths containing real IPs or customer domains.

```
/opt/service-platform/
  app/                    # git clone (docker-compose.prod.yml lives here)
  backups/                # pg_dump output — gitignored, never in repo
  logs/                   # optional job/proxy logs — no secrets
  secrets/                # .env.production — chmod 600, not in repo
```

| Rule | Detail |
|------|--------|
| **`.env.production`** | Lives only under `secrets/` (or equivalent); never committed |
| **Backups / logs** | Must not be copied into git or shared publicly |
| **Permissions** | Restrict `secrets/` and `backups/` (e.g. `chmod 700`); deploy user only |

Example (operator runs on VPS):

```bash
sudo mkdir -p /opt/service-platform/{app,backups,logs,secrets}
sudo chown -R deploy-user:deploy-user /opt/service-platform
chmod 700 /opt/service-platform/secrets /opt/service-platform/backups
```

---

## D. Clone or update code

### First deploy

```bash
cd /opt/service-platform/app
git clone https://github.com/ORG/REPO.git .
git checkout main
git rev-parse HEAD    # record for rollback
```

Replace `ORG/REPO` with your repository — do not embed tokens in commands or docs.

### Update deploy

```bash
cd /opt/service-platform/app
git fetch origin
git checkout main
git pull origin main
git rev-parse HEAD    # record new commit
```

- [ ] Branch/commit verified matches intended release
- [ ] No manual edits to tracked source files on VPS (config via `.env` / secrets only)
- [ ] No `.env`, `.pem`, or dump files added to the clone

---

## E. Create `.env.production`

1. Copy template on VPS only:

```bash
cp /opt/service-platform/app/.env.production.example \
   /opt/service-platform/secrets/.env.production
chmod 600 /opt/service-platform/secrets/.env.production
```

2. Link or copy for Compose (project reads `.env` in app directory):

```bash
ln -sf /opt/service-platform/secrets/.env.production \
       /opt/service-platform/app/.env
```

3. Edit **on VPS only** — never commit, paste into chat, or log full contents.

**Safe defaults for dry-run:**

```env
EMAIL_ENABLED=false
EMAIL_DRY_RUN=true
STRIPE_ENABLED=false
APP_ENV=production
API_DOCS_ENABLED=false
```

**Align public URLs** (placeholders — replace on VPS):

| Variable | Placeholder |
|----------|-------------|
| `PUBLIC_APP_URL` | `https://your-domain.example` |
| `PUBLIC_API_URL` | `https://your-domain.example/api/v1` |
| `CORS_ORIGINS` | `https://your-domain.example` |
| `STRIPE_SUCCESS_URL` | `https://your-domain.example/billing/success` |
| `STRIPE_CANCEL_URL` | `https://your-domain.example/billing/cancel` |

See [VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md](./VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md) for DNS/HTTPS alignment.

- [ ] `JWT_SECRET_KEY` and `POSTGRES_PASSWORD` generated on server (not from docs)
- [ ] No placeholder `CHANGE_ME` values left for production strict check
- [ ] `.env.production` not in git status on VPS clone

---

## F. Build and start containers

From app directory, using project compose file **`docker-compose.prod.yml`**:

```bash
cd /opt/service-platform/app

docker compose -p service_platform_prod \
  -f docker-compose.prod.yml build

docker compose -p service_platform_prod \
  -f docker-compose.prod.yml up -d

docker compose -p service_platform_prod \
  -f docker-compose.prod.yml ps
```

- [ ] All services `running` / `healthy` (postgres, api, web)
- [ ] API not published on public `:8000` (prod compose uses `expose` only)
- [ ] Web mapped to `${WEB_HTTP_PORT:-80}:8080` — host reverse proxy forwards here

---

## G. Database migration

```bash
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml exec api alembic upgrade head
```

- [ ] Migration completes without error
- [ ] **Never delete** Postgres volume during routine deploy (`service_platform_postgres_prod_data`)
- [ ] **Backup before** any destructive operation — see section K

**Dry-run note:** Do **not** run `seed_demo.py` when `APP_ENV=production` unless you explicitly override demo safeguards for a disposable staging box.

---

## H. Production validation

Run on VPS (values are not printed):

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api \
  python scripts/check_production_env.py --env-file .env --strict

docker compose -p service_platform_prod -f docker-compose.prod.yml exec api \
  python scripts/check_security_readiness.py

docker compose -p service_platform_prod -f docker-compose.prod.yml exec api \
  python scripts/check_email_readiness.py

docker compose -p service_platform_prod -f docker-compose.prod.yml exec api \
  python scripts/check_billing_flow.py
```

| Check | Dry-run expectation |
|-------|---------------------|
| **Email readiness** | Passes with `EMAIL_DISABLED` / dry-run — **no real email sent** |
| **Stripe** | `STRIPE_ENABLED=false` — checkout disabled safely |
| **Strict env** | Fails until placeholders replaced; must pass before go-live |

Optional full backend audit:

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api \
  python scripts/check_backend.py
```

---

## I. Smoke tests

Replace `your-domain.example` with your staging hostname. Check logs for secrets before sharing.

### Infrastructure

- [ ] `curl -fsS https://your-domain.example/health` → OK
- [ ] Frontend loads over HTTPS (`https://your-domain.example/`)

### Auth & admin

- [ ] Login works (owner / superadmin test accounts if seeded on staging only)
- [ ] Registration works **with consent checkbox**
- [ ] Business admin dashboard (`/admin`) loads
- [ ] Superadmin login (`/superadmin`) works — trusted operators only
- [ ] Manual superadmin plan change **persists after reload**

### Public flows

- [ ] Public business page loads
- [ ] Public booking flow completes
- [ ] Public order/request flow completes

### Legal & compliance UI

- [ ] Consent records pages load (admin + superadmin read-only)
- [ ] Legal placeholder pages load (`/legal/terms`, `/legal/privacy`, etc.)

### Safety

- [ ] API docs **not** public (`API_DOCS_ENABLED=false`)
- [ ] Application logs reviewed — **no** JWTs, passwords, SMTP/Stripe secrets, or full `.env`

Optional API audit script (after demo seed on **non-production** staging only):

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api \
  python scripts/e2e_backend_audit.py
```

---

## J. Reverse proxy / HTTPS

Follow [VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md](./VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md).

- [ ] DNS `A`/`AAAA` points to VPS (propagation verified)
- [ ] HTTPS certificate issued and auto-renewal configured
- [ ] Host reverse proxy → Docker `WEB_HTTP_PORT` (default 80)
- [ ] `CORS_ORIGINS` matches public HTTPS origin
- [ ] Frontend uses same-origin `/api/v1` (default prod build) or documented HTTPS API URL
- [ ] No mixed-content warnings in browser devtools
- [ ] Security headers present (CSP, `X-Frame-Options`, etc. — from web nginx)
- [ ] Optional: OWASP ZAP baseline on staging HTTPS URL

---

## K. Backup dry-run

See [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) · [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md).

- [ ] Backup directory exists and is writable (`/opt/service-platform/backups/postgres/`)
- [ ] Helper script available: `scripts/backup_postgres.sh` (optional)
- [ ] **One manual backup created** on VPS:

```bash
BACKUP_DIR=/opt/service-platform/backups/postgres
mkdir -p "$BACKUP_DIR"
docker compose -p service_platform_prod -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/dryrun_YYYYMMDD.sql.gz"
```

- [ ] Backup file **not** committed to git
- [ ] Restore procedure documented and understood ([BACKUP_RESTORE.md](./BACKUP_RESTORE.md))
- [ ] Full destructive restore **not required** for this dry-run unless operator explicitly chooses a disposable VM

---

## L. Email dry-run

Follow [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md).

- [ ] `EMAIL_ENABLED=false` **or** `EMAIL_DRY_RUN=true`
- [ ] `check_email_readiness.py` passes (section H)
- [ ] **No real email sent** during this checklist
- [ ] Live SMTP test **only** via SMTP runbook Stage 3+ with explicit operator recipient

---

## M. Stripe disabled / test-mode dry-run

Follow [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md).

- [ ] `STRIPE_ENABLED=false` (default for dry-run)
- [ ] Checkout returns disabled/safe error (`STRIPE_DISABLED`) — Admin Settings shows not enabled
- [ ] Manual superadmin plan change still works
- [ ] Test-mode checkout/webhook **only** if explicitly following Stripe runbook with **test keys only**
- [ ] **No live keys** (`sk_live_…`) on VPS during dry-run

---

## N. Rollback checklist

If deploy fails:

1. [ ] Record failing commit: `git rev-parse HEAD`
2. [ ] Disable live modes first: `EMAIL_DRY_RUN=true` or `EMAIL_ENABLED=false`; `STRIPE_ENABLED=false`
3. [ ] Checkout previous known-good commit:

```bash
cd /opt/service-platform/app
git checkout <previous-commit-sha>
docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
```

4. [ ] Revert host reverse proxy config if changed; reload proxy
5. [ ] Verify health: `curl -fsS https://your-domain.example/health`
6. [ ] **Restore DB only if necessary** — after explicit confirmation; use backup from section K
7. [ ] **Do not delete** Postgres volume unless performing intentional restore to empty DB

---

## O. Go / no-go decision

Manual sign-off before **public** launch:

| Gate | Status |
|------|--------|
| Pre-flight CI/scans green | ☐ |
| Strict production env check passes | ☐ |
| HTTPS + CORS aligned | ☐ |
| Smoke tests pass (section I) | ☐ |
| Backup created + restore path understood | ☐ |
| Email mode intentional (`disabled` / dry-run / live per SMTP runbook) | ☐ |
| Stripe mode intentional (`disabled` / test per Stripe runbook) | ☐ |
| Legal pages reviewed — placeholders noted ([LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md)) | ☐ |
| Monitoring plan acknowledged ([MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md)) | ☐ |
| No known blocker from [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) | ☐ |

**Public launch decision remains manual** — this checklist confirms technical readiness only.

---

## P. Known limitations

- Does **not** replace legal, privacy, or tax review
- No automated deploy pipeline or provider-specific VPS panel guide
- No live payment or email deliverability guarantee
- Retention / export / deletion flows are **design-only** unless implemented in later slices ([DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md))
- Demo seed and demo credentials must not be used on public production
- Provider-specific firewall, DNS, and cert tooling vary — adapt generic steps

---

**Last updated:** Phase 8 Slice 5 — VPS dry-run deployment checklist (docs only; no code changes).
