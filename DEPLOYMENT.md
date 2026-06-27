# Deployment guide (VPS)

This document prepares the project for a future VPS deployment. **No automated deployment is included yet** — follow these steps manually when you are ready.

Related docs:

- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) — pre-launch and post-launch checks
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) — Postgres backup and restore commands
- [README_BACKEND.md](./README_BACKEND.md) — API setup and tests
- [README_FRONTEND.md](./README_FRONTEND.md) — frontend dev vs Docker production

---

## Compose files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | **Local dev** — api bind mount, uvicorn `--reload`, web on port **5173**, postgres on **5433** |
| `docker-compose.prod.yml` | **Production** — no bind mount, no reload, api internal only, web on port **80** (configurable) |

Do not run both files against the same Compose **project** without care — service names overlap. Use a separate project name for production:

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml ...
```

Or stop the dev stack first: `docker compose down` (without `-v` keeps dev DB volume).

---

## A. Server requirements

| Requirement | Notes |
|-------------|--------|
| **OS** | Ubuntu 22.04/24.04 LTS VPS (or similar Linux) |
| **Docker** | Engine 24+ |
| **Docker Compose** | Compose plugin (`docker compose`, not legacy `docker-compose`) |
| **Domain** | DNS A/AAAA record pointing to the VPS public IP |
| **Ports** | **80** and **443** open on the firewall (HTTP/HTTPS) |
| **Resources** | 2 GB RAM minimum recommended; 1 vCPU is enough for small pilots |
| **Swap** | Optional but helpful on 1–2 GB RAM hosts (`2G` swap file) |

Install Docker on Ubuntu (official docs): https://docs.docker.com/engine/install/ubuntu/

---

## B. First deployment (production compose)

### 1. Clone the repository

```bash
git clone <your-repo-url> service_platform_pwa
cd service_platform_pwa
```

### 2. Configure environment

```bash
cp .env.production.example .env
nano .env   # replace all CHANGE_ME values
chmod 600 .env
```

**Minimum changes:**

- `POSTGRES_PASSWORD` and the same password in `DATABASE_URL`
- `JWT_SECRET_KEY` — at least 32 random bytes (e.g. `openssl rand -hex 32`)
- `CORS_ORIGINS` — your public URL, e.g. `https://app.example.com`
- `PUBLIC_APP_URL` / `PUBLIC_API_URL` — for your runbook

Postgres credentials are read from `.env` by `docker-compose.prod.yml` — no hardcoded passwords in the prod compose file.

**Do not** use demo passwords or `seed_demo.py` on a real production site unless this is a private demo.

### 3. Validate environment (before first deploy and after edits)

From project root on the VPS (or locally while preparing `.env`):

```bash
python scripts/check_production_env.py --env-file .env --strict
```

This checks required variables, JWT length, placeholder passwords, and `DATABASE_URL` host (`postgres` for Compose). Optional Stripe/SMTP keys warn only.

Template sanity (placeholders allowed — **do not** use `--strict`):

```bash
python scripts/check_production_env.py --env-file .env.production.example
```

### 4. Build and start

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api alembic upgrade head
```

Optional **demo only**:

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api python scripts/seed_demo.py
```

### 5. Verify health

```bash
curl -s http://localhost/health              # via web nginx proxy
curl -s http://localhost/api/v1/public/b/demo-business   # if demo seeded
```

Open in browser: `http://<server-ip>/` (or your domain after HTTPS).

On **Windows** or if port 80 is busy, set in `.env`:

```env
WEB_HTTP_PORT=8080
```

Then use `http://localhost:8080`.

### 6. Local development (unchanged)

For day-to-day development, use the dev compose file:

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
```

Dev stack: frontend http://localhost:5173, API http://localhost:8000, postgres host port 5433.

---

## C. Domain and HTTPS

Do **not** expose plain HTTP to the internet long term. Terminate TLS at a reverse proxy.

| Option | When to use |
|--------|-------------|
| **Caddy** | Simplest automatic HTTPS; good default for a single VPS |
| **Nginx Proxy Manager** | GUI for certs and routing |
| **Traefik** | Docker-native labels; more services later |
| **Cloudflare Tunnel** | No open inbound ports |

**Recommended:** Caddy or Nginx Proxy Manager in front of the `web` container. Route `https://your-domain.example/` → host port **80** (or `WEB_HTTP_PORT`). The `web` nginx already proxies `/api/` to `api` — one public hostname is enough.

Example Caddy (host):

```caddy
your-domain.example {
    reverse_proxy localhost:80
}
```

Block direct public access to API port 8000 on the firewall — prod compose does not publish it.

---

## D. Production checks

| Check | Command / action |
|-------|------------------|
| Health | `curl https://your-domain.example/health` |
| Frontend | Open `/` |
| SPA routes | Hard refresh `/login`, `/admin`, `/b/<slug>` |
| Login | Real admin account |
| Public page | `/b/<business-slug>/services` |
| `/docs` | Off when `APP_ENV=production` |
| Secrets | `.env` not in git, `chmod 600` |

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

---

## E. Updating a deployment

```bash
cd service_platform_pwa
git pull
docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api alembic upgrade head
docker compose -p service_platform_prod -f docker-compose.prod.yml logs -f api web
```

Smoke-check health, login, and one public page after each update.

Take a backup before migrations — [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

---

## F. Rollback (basic)

1. **Application**
   ```bash
   git checkout <previous-commit-sha>
   docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
   ```

2. **Database** — restore from backup; Alembic downgrade is manual and risky.

3. Always backup before `alembic upgrade head` on production.

---

## G. Logs, restart, stop

Set `COMPOSE_PROJECT_NAME` or use `-p service_platform_prod` on every command.

**Logs:**

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml ps
docker compose -p service_platform_prod -f docker-compose.prod.yml logs -f api
docker compose -p service_platform_prod -f docker-compose.prod.yml logs -f web
```

**Restart one service:**

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml restart api
```

**Stop (keep data):**

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml down
```

**Stop and remove prod DB volume (destructive):**

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml down -v
```

This only removes `service_platform_postgres_prod_data` — dev volume `service_platform_postgres_data` is separate.

---

## Dev vs prod side-by-side (local)

| Concern | Dev (`docker-compose.yml`) | Prod (`docker-compose.prod.yml`) |
|---------|---------------------------|----------------------------------|
| Project name | default (folder name) | use `-p service_platform_prod` |
| API reload / mount | yes | no |
| API host port | 8000 | not published |
| Web port | 5173 | 80 (or `WEB_HTTP_PORT`) |
| Postgres host port | 5433 | not published |
| DB volume | `service_platform_postgres_data` | `service_platform_postgres_prod_data` |

To smoke-test prod locally without stopping dev:

```bash
# In .env for prod smoke only:
WEB_HTTP_PORT=8080

docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
# ... test http://localhost:8080 ...
docker compose -p service_platform_prod -f docker-compose.prod.yml down
```

---

## What is not included yet

- Automated deploy (GitHub Actions → VPS)
- Managed TLS in compose
- Gunicorn / multiple uvicorn workers
- Stripe, email, monitoring
- Automated backups (commands in [BACKUP_RESTORE.md](./BACKUP_RESTORE.md))
