# Backup Readiness Report — Phase 7 (Slice 4)

**Purpose:** PostgreSQL backup/restore baseline for future VPS operations.  
**Status:** Planning + optional helper scripts — **no automated VPS backups active yet**.  
**Not in scope:** Live deployment, off-server object storage, encrypted backup tooling, or committing database dumps.

Related: [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) · [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

---

## A. Current status

| Item | Status |
|------|--------|
| **Automated VPS backups** | ❌ Not implemented — manual `pg_dump` only |
| **PostgreSQL storage** | Docker named volume `service_platform_postgres_prod_data` (prod compose) |
| **Backup location** | Must be **outside** the git repo (`backups/` is gitignored) |
| **Restore tested on clone** | ⏳ Required before public launch — not automated in repo |
| **Helper scripts** | Optional: [scripts/backup_postgres.sh](./scripts/backup_postgres.sh), [scripts/restore_postgres.sh](./scripts/restore_postgres.sh) — VPS/bash only |
| **Point-in-time recovery** | ❌ WAL archiving not configured |

---

## B. Backup principles

1. **Never commit database dumps** — `.sql`, `.sql.gz`, `.dump`, and `backups/` must stay out of git.
2. **Never store backups inside the repo** — use `/opt/service-platform/backups/postgres/` or equivalent on the VPS.
3. **Protect backups on the server** — `chmod 700` on backup directories; encrypt or copy off-host when possible.
4. **Test restore regularly** — at least once on a disposable/staging clone before public launch.
5. **Backup before migrations and deploys** — schema changes may not be reversible without a dump.
6. **Do not print DB passwords** — `pg_dump` / `psql` run inside the Postgres container; credentials come from container env, not CLI arguments in docs or scripts.
7. **Do not log connection strings** — validation and helper output use static status codes only.

---

## C. Recommended server folders

```text
/opt/service-platform/
  repo/                      # git clone — no dumps here
  env/
    .env.production          # secrets only on server (chmod 600)
  backups/
    postgres/                # pg_dump output (.sql.gz)
    logs/                    # optional backup job logs (no secrets)
```

Create once on the VPS:

```bash
sudo mkdir -p /opt/service-platform/{repo,env,backups/postgres,backups/logs}
sudo chown -R "$USER:$USER" /opt/service-platform
chmod 700 /opt/service-platform/env
chmod 700 /opt/service-platform/backups
```

---

## D. Manual backup command template

Run from `repo/` with the **production stack running**. Replace paths; use placeholders only in documentation.

**Password handling:** `POSTGRES_PASSWORD` is loaded by the `postgres` service from `.env` / `env_file`. `pg_dump` inside the container authenticates via container environment — **do not** pass the password on the host command line and **do not** echo env files.

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/service-platform/backups/postgres"
mkdir -p "$BACKUP_DIR"

docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production \
  exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-service_platform}" \
  -d "${POSTGRES_DB:-service_platform}" \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_DIR/service_platform_prod_${TIMESTAMP}.sql.gz"
```

Verify the file exists and is non-empty:

```bash
test -s "$BACKUP_DIR/service_platform_prod_${TIMESTAMP}.sql.gz" && echo "OK: backup_file_non_empty"
```

**Optional helper (VPS/bash):**

```bash
./scripts/backup_postgres.sh \
  --env-file /opt/service-platform/env/.env.production \
  --backup-dir /opt/service-platform/backups/postgres
```

More examples (dev stack, PowerShell): [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

---

## E. Manual restore command template

**Warnings:**

- **Stop writers first** — stop `api` and `web` (or put the site in maintenance mode) before restore.
- **Backup current DB** — take a fresh dump before overwriting data.
- **Restore to the correct database only** — wrong target can destroy production data.
- **Match app version** — restoring an old dump may require the matching git commit or `alembic upgrade head` after restore.

### 1. Stop API and web (keep postgres running)

```bash
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  stop api web
```

### 2. Restore from gzip dump

```bash
BACKUP_FILE="/opt/service-platform/backups/postgres/service_platform_prod_YYYYMMDD_HHMMSS.sql.gz"

gunzip -c "$BACKUP_FILE" | docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  exec -T postgres psql \
  -U "${POSTGRES_USER:-service_platform}" \
  -d "${POSTGRES_DB:-service_platform}"
```

If the database must be recreated (destructive):

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml exec -T postgres \
  psql -U "${POSTGRES_USER:-service_platform}" -d postgres -c \
  "DROP DATABASE IF EXISTS service_platform;"
docker compose -p service_platform_prod -f docker-compose.prod.yml exec -T postgres \
  psql -U "${POSTGRES_USER:-service_platform}" -d postgres -c \
  "CREATE DATABASE service_platform OWNER service_platform;"
# Then run gunzip | psql restore as above
```

### 3. Start services and verify

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml up -d api web
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api alembic upgrade head
curl -sf "http://127.0.0.1:${WEB_HTTP_PORT:-80}/health"
```

**Optional helper (VPS/bash):**

```bash
./scripts/restore_postgres.sh \
  --env-file /opt/service-platform/env/.env.production \
  --backup-file /opt/service-platform/backups/postgres/service_platform_prod_YYYYMMDD_HHMMSS.sql.gz
```

Full step-by-step: [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

---

## F. Pre-update backup checklist

Before `git pull`, image rebuild, or `alembic upgrade head` on staging/production:

- [ ] Working tree clean or changes intentionally recorded
- [ ] Current git commit hash / tag noted (`git rev-parse HEAD`)
- [ ] Fresh Postgres backup created (§D)
- [ ] Backup file exists and is non-empty (`test -s`)
- [ ] Migration plan reviewed (`alembic history` / release notes)
- [ ] Rollback plan documented (§H in [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md))
- [ ] Team notified if production maintenance window required

---

## G. Restore test checklist

Run on a **disposable** VPS clone or local prod-compose smoke — not on live production traffic without a maintenance window.

- [ ] Create a test backup from a known-good database
- [ ] Provision test environment (separate compose project or volume)
- [ ] Restore backup into test environment (§E)
- [ ] `GET /health` returns OK
- [ ] `GET /api/v1/health` returns OK (via proxy if configured)
- [ ] Login smoke — owner or test account (do not log tokens)
- [ ] Public booking or order smoke on test business slug
- [ ] Document restore duration and any manual steps
- [ ] Delete test volume / instance when finished

---

## H. Future automation plan (later slices)

| Item | Planned |
|------|---------|
| Scheduled backup script wrapper | Later — cron or systemd timer calling `backup_postgres.sh` |
| Off-server copy | Later — `scp`, `rsync`, or object storage; encrypt in transit |
| Retention policy | Later — e.g. keep 7 daily, 4 weekly; prune old `.sql.gz` |
| Backup failure alerts | Later — monitoring if dump missing or zero-byte |
| Encrypted backups at rest | Later — `gpg` or provider-side encryption |
| Point-in-time recovery | Later — Postgres WAL archiving (not in MVP) |

**This slice does not enable cron or off-server sync** — operators run backups manually until a future slice.

---

## Quick reference

| Stack | Compose file | Project name | Postgres container |
|-------|--------------|--------------|-------------------|
| Dev | `docker-compose.yml` | (default) | `service_platform_postgres` |
| Prod | `docker-compose.prod.yml` | `service_platform_prod` | `service_platform_postgres_prod` |

| Volume (prod) | `service_platform_postgres_prod_data` — do not `docker volume rm` casually |

---

**Last updated:** Phase 7 Slice 4 — PostgreSQL backup/restore baseline (no live deployment).
