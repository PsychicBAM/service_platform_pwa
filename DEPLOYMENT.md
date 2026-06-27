# Deployment guide (VPS)

This document prepares the project for a future VPS deployment. **No automated deployment is included yet** — follow these steps manually when you are ready.

Related docs:

- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) — pre-launch and post-launch checks
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) — Postgres backup and restore commands
- [README_BACKEND.md](./README_BACKEND.md) — API setup and tests
- [README_FRONTEND.md](./README_FRONTEND.md) — frontend dev vs Docker production

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

## B. First deployment

### 1. Clone the repository

```bash
git clone <your-repo-url> service_platform_pwa
cd service_platform_pwa
```

### 2. Configure environment

```bash
cp .env.production.example .env
nano .env   # or vim — replace all CHANGE_ME values
```

**Minimum changes:**

- `POSTGRES_PASSWORD` and matching password in `DATABASE_URL`
- `JWT_SECRET_KEY` — at least 32 random bytes (e.g. `openssl rand -hex 32`)
- `CORS_ORIGINS` — your public URL, e.g. `https://app.example.com`
- `PUBLIC_APP_URL` / `PUBLIC_API_URL` — for your own runbook notes

Also update `docker-compose.yml` **postgres** `environment` block so `POSTGRES_PASSWORD` matches `.env` (Compose does not interpolate `.env` into the postgres image env by default).

**Do not** use demo passwords or `seed_demo.py` credentials in production unless this is a private demo environment.

### 3. Build and start

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
```

Optional **demo only** (not for real production):

```bash
docker compose exec api python scripts/seed_demo.py
```

### 4. Verify health

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:5173/health          # proxied to API via nginx
curl -s http://localhost:5173/api/v1/public/b/demo-business   # if demo seeded
```

Open in browser:

- Frontend: `http://<server-ip>:5173` (or your domain after HTTPS setup)
- Login, public business page, admin/superadmin (with real accounts, not demo)

### 5. Production-hardening notes (manual)

The default `docker-compose.yml` is optimized for **local development**:

- `api` runs with `--reload` and mounts `./api` as a volume.

On a real VPS, consider:

- Remove `--reload` from the `api` command
- Remove the `./api:/app` volume mount (use the image build only)
- Put nginx/Caddy/Traefik in front on ports 80/443 instead of exposing 5173/8000 publicly
- Set `APP_ENV=production` so `/docs` and `/redoc` are disabled (see `api/app/config.py`)

These changes are **not** applied automatically in this repo slice — document and apply when you deploy.

---

## C. Domain and HTTPS

Do **not** expose plain HTTP to the internet long term. Terminate TLS at a reverse proxy.

| Option | When to use |
|--------|-------------|
| **Caddy** | Simplest automatic HTTPS; good default for a single VPS |
| **Nginx Proxy Manager** | GUI for certs and routing; familiar if you use NPM already |
| **Traefik** | Docker-native labels; good if you add more services later |
| **Cloudflare Tunnel** | No open inbound ports; Cloudflare handles edge TLS |

**Recommended for this project (keep it simple):** Caddy or Nginx Proxy Manager in front of the existing `web` container (port 80 inside Docker). Route:

- `https://your-domain.example/` → `web:80` (frontend + `/api` proxy)
- Optionally block public access to `:8000` (API direct) on the firewall

Example Caddy snippet (on host, not in repo):

```caddy
your-domain.example {
    reverse_proxy localhost:5173
}
```

The `web` nginx already proxies `/api/` to the `api` service — one public hostname is enough.

---

## D. Production checks

After deploy and HTTPS:

| Check | Command / action |
|-------|------------------|
| API health | `curl https://your-domain.example/health` or via proxy |
| Frontend loads | Open `/` in browser |
| SPA routes | Refresh `/login`, `/admin`, `/b/<slug>` — no 404 from nginx |
| Login | Sign in with a **real** admin account |
| Public page | `/b/<business-slug>` loads services |
| Booking / order | Submit a test booking or order; confirm in admin |
| `/docs` | With `APP_ENV=production`, OpenAPI UI should be **off** |
| Secrets | Confirm `.env` is not in git and permissions are `600` |

Use [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) before go-live.

---

## E. Updating a deployment

```bash
cd service_platform_pwa
git pull
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose logs -f api web
```

Run smoke checks (health, login, one public page) after each update.

If migrations fail, **do not** force-start the old API against a partially migrated DB — restore from backup or fix forward with care (see [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)).

---

## F. Rollback (basic)

1. **Application code**
   ```bash
   git log --oneline -5
   git checkout <previous-commit-sha>
   docker compose up -d --build
   ```

2. **Database migrations**
   - Alembic downgrade is **manual and risky** if data depended on new columns.
   - Safer rollback: restore Postgres from a backup taken **before** the upgrade, then run the old app image.
   - See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

3. **Always** take a backup before `alembic upgrade head` on production.

---

## Logs and restart

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
docker compose restart api
```

Services use `restart: unless-stopped` so they come back after a host reboot (see `docker-compose.yml`).

---

## What is not included yet

- Automated deploy (GitHub Actions → VPS)
- Managed TLS in compose
- Stripe, email, monitoring
- Automated backups (commands only in [BACKUP_RESTORE.md](./BACKUP_RESTORE.md))
