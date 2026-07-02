# VPS Deployment Runbook — Phase 7 (Slice 3)

**Purpose:** Operator guide for deploying this project on a **real VPS** owned by the project owner.  
**Status:** Documentation only — **no live deployment performed in this slice**.  
**Not included:** Live secrets, provider-specific automation, legal/privacy pages, or reverse-proxy config files.

Related: [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) · [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [docker-compose.prod.yml](./docker-compose.prod.yml) · [.env.production.example](./.env.production.example) · [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md)

---

## A. Scope and assumptions

| Assumption | Notes |
|------------|--------|
| **VPS ownership** | You control a Linux VPS (Ubuntu/Debian or similar). |
| **No secrets in git** | Real values exist **only on the server**. This runbook uses placeholders (`CHANGE_ME`, `your-domain.example`). |
| **Docker** | Docker Engine and Docker Compose plugin (v2) installed from [official Docker docs](https://docs.docker.com/engine/install/). |
| **Domain / DNS** | A domain (e.g. `your-domain.example`) will point to the VPS public IP via `A` / `AAAA` records. |
| **HTTPS** | TLS terminates at a **reverse proxy** on the host or at a cloud/proxy provider — not inside the app containers by default. |
| **Compose stack** | Production uses [docker-compose.prod.yml](./docker-compose.prod.yml) — no bind mounts, no uvicorn `--reload`, API port **8000** not published to the internet. |
| **Legal / privacy** | Public launch still requires privacy policy, terms, and consent flows — **not in MVP repo yet**. |

**Out of scope for this runbook:** Marketplace features, language switcher, automated monitoring SaaS setup, live Stripe/SMTP configuration details (see guides when ready).

---

## B. Server preparation checklist

Complete before first deploy:

- [ ] **Provision VPS** — sufficient RAM/disk for Docker + Postgres (2 GB+ RAM recommended for small deployments).
- [ ] **SSH key auth** — disable password-only root login where possible.
- [ ] **Deploy user (optional)** — non-root user in `docker` group for day-to-day operations.
- [ ] **Install Docker + Compose** — follow vendor docs; verify `docker compose version`.
- [ ] **Firewall** — allow only:
  - **22** — SSH (restrict source IPs if possible)
  - **80** — HTTP (reverse proxy or redirect)
  - **443** — HTTPS (public site)
- [ ] **Do not expose publicly:**
  - Postgres (**5432**)
  - API debug port (**8000**)
  - Dev frontend ports (**5173**, etc.)
- [ ] **System time** — NTP enabled; set `TZ` in env if ops require consistent timezone.
- [ ] **Disk planning** — room for Docker images, named volume `service_platform_postgres_prod_data`, and off-repo backups.

Generic firewall example (adjust interface/rules for your distro):

```bash
# Example only — verify against your OS firewall tool (ufw, firewalld, cloud security group).
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## C. Recommended server folder layout

Keep secrets and backups **outside** the git clone:

```text
/opt/service-platform/
  repo/                 # git clone (no secrets committed)
  env/
    .env.production     # server-only secrets (chmod 600)
  backups/              # pg_dump output (not in repo)
  logs/                 # optional host-level log copies / notes
```

**Rules:**

| Item | Location |
|------|----------|
| `.env.production` | `env/` only — never commit, never paste into tickets |
| Runtime `.env` for Compose | Symlink or copy from `env/.env.production` into `repo/.env` (see §D) — `docker-compose.prod.yml` references `.env` for containers |
| Backups | `backups/` or `/var/backups/service_platform/` — see [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) |
| Git repo | `repo/` — pull updates here; no `*.pem`, `*.key`, or `.env` in git |

```bash
sudo mkdir -p /opt/service-platform/{repo,env,backups,logs}
sudo chown -R "$USER:$USER" /opt/service-platform
chmod 700 /opt/service-platform/env
```

---

## D. First deployment steps

Run from the server as the deploy user. Replace placeholders; **do not** commit real values.

### 1. Clone repository

```bash
cd /opt/service-platform
git clone https://github.com/YOUR_ORG/service_platform_pwa.git repo
cd repo
# Optionally: git checkout <release-tag>
```

### 2. Create server-only environment file

```bash
cp .env.production.example /opt/service-platform/env/.env.production
chmod 600 /opt/service-platform/env/.env.production
```

Edit `/opt/service-platform/env/.env.production` on the server:

- `APP_ENV=production`
- `API_DOCS_ENABLED=false`
- `SQLALCHEMY_ECHO=false`
- Strong `JWT_SECRET_KEY` (≥ 32 chars, not `CHANGE_ME`)
- Strong `POSTGRES_PASSWORD` matching `DATABASE_URL`
- `CORS_ORIGINS=https://your-domain.example` (no `*`, no stray localhost)
- `WEB_HTTP_PORT=80` (or another host port if the reverse proxy expects it)
- `EMAIL_ENABLED=false` until SMTP is ready
- `STRIPE_ENABLED=false` until Stripe test mode is configured

### 3. Validate environment (strict)

```bash
cd /opt/service-platform/repo
python3 scripts/check_production_env.py \
  --env-file /opt/service-platform/env/.env.production \
  --strict
```

Must exit **0** before go-live. The template `.env.production.example` in git **fails** `--strict` by design.

### 4. Link env for Docker Compose

`docker-compose.prod.yml` loads `env_file: .env` into containers:

```bash
ln -sf /opt/service-platform/env/.env.production .env
# Or: cp /opt/service-platform/env/.env.production .env && chmod 600 .env
```

### 5. Build images

```bash
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production \
  build
```

### 6. Start stack

```bash
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production \
  up -d
```

### 7. Run migrations

```bash
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  exec api alembic upgrade head
```

### 8. Health check (local on VPS)

```bash
# WEB_HTTP_PORT from your .env.production (default 80)
curl -sf "http://127.0.0.1:${WEB_HTTP_PORT:-80}/health"
```

Expected: HTTP 200 from nginx → API health.

### 9. Frontend smoke (local on VPS)

```bash
curl -sI "http://127.0.0.1:${WEB_HTTP_PORT:-80}/" | head -n 1
```

Expected: HTTP 200; SPA `index.html` served.

### 10. Seed demo data — **staging only**

**Do not** run `seed_demo.py` on public production unless this is an intentional demo/staging server.

```bash
# Staging / private demo only:
# docker compose -p service_platform_prod -f docker-compose.prod.yml exec api python scripts/seed_demo.py
```

If used, change all demo passwords immediately and restrict access.

### 11. Configure reverse proxy + HTTPS

See §E before announcing the public URL.

### 12. Post-deploy audits (staging)

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml \
  exec api python scripts/check_security_readiness.py
```

---

## E. Reverse proxy / HTTPS plan

The `web` container exposes nginx on host port **`WEB_HTTP_PORT`** (default **80**), mapping to internal **8080**. Public HTTPS is typically handled **outside** the Compose file.

### Option 1: External reverse proxy on the VPS host

| Component | Role |
|-----------|------|
| **Caddy** or **nginx** on host | Listens on **443** (and **80** for ACME / redirect) |
| **Upstream** | `http://127.0.0.1:${WEB_HTTP_PORT}` (the `web` container) |
| **Certificates** | Let's Encrypt via Caddy auto-TLS or certbot + nginx |
| **HSTS** | Enable only after HTTPS is verified end-to-end |

**Routing goals:**

- `https://your-domain.example/` → SPA (static + client routing)
- `https://your-domain.example/api/v1/...` → proxied to API (same origin via `web` nginx — already configured in `web/nginx.conf` for `/api/v1`)

**Do not** publish API port **8000** to the internet; prod compose uses `expose` only.

### Option 2: Cloud / CDN reverse proxy

| Component | Role |
|-----------|------|
| **Cloudflare**, **AWS ALB**, etc. | TLS termination at edge |
| **Origin** | VPS accepts HTTP from provider IPs only (optional hardening) |
| **DNS** | Proxy orange-cloud or equivalent → VPS |

Document provider firewall rules separately. Stripe webhooks and email links must use the **public HTTPS** URL configured in server env.

**This slice does not add reverse-proxy config files** — implement when provisioning the VPS.

---

## F. Production smoke tests

Run on **HTTPS staging** before public launch. Use test accounts; **do not log tokens or secrets**.

| # | Check | Pass |
|---|--------|------|
| 1 | `GET /` — SPA loads | ☐ |
| 2 | `GET /health` — nginx → API health OK | ☐ |
| 3 | `GET /api/v1/health` — API health via proxy | ☐ |
| 4 | Register test business (or pre-provision owner) | ☐ |
| 5 | Email verification — depends on `EMAIL_ENABLED` / SMTP; dry-run OK on staging without SMTP | ☐ |
| 6 | Login owner → `/admin` dashboard | ☐ |
| 7 | Create / edit service | ☐ |
| 8 | Public booking flow (guest or client) | ☐ |
| 9 | Client order / request flow | ☐ |
| 10 | Admin order flow + message thread | ☐ |
| 11 | Superadmin login → platform businesses view | ☐ |
| 12 | Stripe checkout — **test mode only** after `STRIPE_ENABLED=true` + webhook URL; not live keys on first smoke | ☐ |

**Hard refresh:** `/login`, `/admin`, `/b/<slug>` must not 404 (nginx SPA fallback).

Optional: manual OWASP ZAP baseline on **owned** staging URL — see [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md).

---

## G. Backup plan draft

See [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) for principles, checklists, and optional helpers. Summary:

Backups contain all business data — encrypt at rest, restrict permissions. **Never commit dumps to git.**

### Backup directory

```bash
BACKUP_ROOT=/opt/service-platform/backups/postgres
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
```

### Postgres dump (production compose)

From `repo/` with stack running — uses container env for DB user/db name (no password on command line):

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/opt/service-platform/backups/postgres}"

docker compose -p service_platform_prod -f docker-compose.prod.yml \
  exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-service_platform}" \
  -d "${POSTGRES_DB:-service_platform}" \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_DIR/service_platform_prod_${TIMESTAMP}.sql.gz"
```

**Optional helper (VPS/bash):** `./scripts/backup_postgres.sh --env-file /opt/service-platform/env/.env.production`

Schedule via cron is **future work** — not enabled in this slice.

Schedule via `cron` (e.g. daily off-peak). Copy archives off-host when possible.

### Restore (template)

**Stop traffic or put app in maintenance before restore on production.**

```bash
# Example — adjust BACKUP_FILE path; test on a clone first.
BACKUP_FILE=/opt/service-platform/backups/service_platform_prod_YYYYMMDD_HHMMSS.sql.gz

gunzip -c "$BACKUP_FILE" | docker compose -p service_platform_prod -f docker-compose.prod.yml \
  exec -T postgres psql -U "${POSTGRES_USER:-service_platform}" -d "${POSTGRES_DB:-service_platform}"
```

Full procedure and warnings: [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md).

**Optional helper:** `./scripts/restore_postgres.sh --backup-file "$BACKUP_FILE" --stop-writers`

### Volume safety

- Named volume: `service_platform_postgres_prod_data`
- **Do not** `docker volume rm` casually — destroys data
- **Test restore** at least once on a non-production clone before launch

---

## H. Update / rollback plan

### Routine update

```bash
cd /opt/service-platform/repo

# 1. Backup first (§G)
# 2. Pull code
git pull

# 3. Re-validate env if example template changed
python3 scripts/check_production_env.py \
  --env-file /opt/service-platform/env/.env.production \
  --strict

# 4. Rebuild and restart
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production \
  up -d --build

# 5. Migrate
docker compose -p service_platform_prod -f docker-compose.prod.yml \
  exec api alembic upgrade head

# 6. Smoke tests (§F)
curl -sf "http://127.0.0.1:${WEB_HTTP_PORT:-80}/health"
```

### Rollback

```bash
cd /opt/service-platform/repo
git checkout <previous-known-good-commit>
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production \
  up -d --build
```

**Database:** Alembic upgrades may not be reversible. If a migration fails or rollback is needed, restore from backup (§G) rather than assuming `alembic downgrade` is safe.

---

## I. Logs and monitoring

### Container logs

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml logs -f --tail=200 api web
docker compose -p service_platform_prod -f docker-compose.prod.yml logs --tail=100 postgres
```

**Do not** enable `SQLALCHEMY_ECHO=true` in production — SQL bind params can leak sensitive fields.

### Health checks

| Check | Command / endpoint |
|-------|-------------------|
| Compose health | `docker compose -p service_platform_prod -f docker-compose.prod.yml ps` |
| HTTP health | `curl -sf https://your-domain.example/health` |
| API health | `curl -sf https://your-domain.example/api/v1/health` |

### Resource usage

```bash
docker system df
docker volume ls
df -h /var/lib/docker
```

Monitor Postgres volume growth and host disk; plan retention for backups and logs.

### Future monitoring (not automated in repo)

- Uptime probe on `/health`
- Error-rate / 5xx alerts from reverse proxy or APM
- Backup success/failure notifications
- Disk-space alerts

---

## J. Production blockers reminder

| Blocker | Status (pre-VPS) |
|---------|------------------|
| **Legal / privacy / consent pages** | ❌ Required before public marketing site |
| **Live SMTP on VPS** | ⏳ `EMAIL_ENABLED=false` by default |
| **Stripe on VPS** | ⏳ `STRIPE_ENABLED=false`; use test mode first — [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) |
| **Automated backups** | ⏳ [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) + optional `scripts/backup_postgres.sh`; cron not enabled |
| **Monitoring / alerts** | ⏳ Not automated |
| **Domain + HTTPS** | ⏳ Not configured until VPS provisioned |
| **Demo credentials** | Must not remain on public production |
| **Real VPS deployment** | ❌ **Not performed** — follow this runbook when ready |

---

## Local prod-compose smoke (developer machine)

Safe validation **without** a real VPS:

```bash
WEB_HTTP_PORT=8080 docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file .env.production.example \
  up -d --build

curl -sf http://localhost:8080/health
curl -sI http://localhost:8080/ | head -n 1

docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file .env.production.example \
  down
```

**Note:** `.env.production.example` is not valid for `--strict` until real secrets are set on a server. Internal `web` nginx listens on **8080**; host mapping is `${WEB_HTTP_PORT}:8080`.

---

**Last updated:** Phase 7 Slice 3 — VPS deployment runbook (documentation only; no live deployment).
