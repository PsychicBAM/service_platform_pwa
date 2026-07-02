# Backup and restore (Postgres)

Manual backup/restore procedures for the Docker Compose stack. **No automated backup service is included yet** — see [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) for VPS checklists and optional `scripts/backup_postgres.sh`.

Related: [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

---

## Before you start

- Backups contain **all user and business data** — store encrypted, restrict permissions.
- Default DB: user `service_platform`, database `service_platform`.
- **Dev stack:** container `service_platform_postgres`, compose file `docker-compose.yml`.
- **Prod stack:** container `service_platform_postgres_prod`, compose file `docker-compose.prod.yml` with `-p service_platform_prod`.
- Adjust names if you changed `.env` or container names.

Use `-f` and `-p` flags consistently with how you started the stack (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

**Suggested backup location on VPS:**

```text
/var/backups/service_platform/
```

Create it once:

```bash
sudo mkdir -p /var/backups/service_platform
sudo chown "$USER:$USER" /var/backups/service_platform
```

---

## Backup Postgres

### Local dev compose (`docker-compose.yml`)

#### Linux / macOS (bash)

From project root with stack running:

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump \
  -U service_platform \
  -d service_platform \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_DIR/service_platform_${TIMESTAMP}.sql.gz"

ls -lh "$BACKUP_DIR/service_platform_${TIMESTAMP}.sql.gz"
```

#### Windows (PowerShell)

From project root:

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backups" }
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$outFile = Join-Path $backupDir "service_platform_$timestamp.sql.gz"

docker compose exec -T postgres pg_dump -U service_platform -d service_platform --no-owner --no-acl |
  gzip > $outFile

Get-Item $outFile
```

> If `gzip` is not available in PowerShell, pipe to a plain `.sql` file or install gzip via WSL/Git Bash.

### Production compose (`docker-compose.prod.yml`)

Use the same project name as deployment (`-p service_platform_prod`):

**Linux / bash:**

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

docker compose -p service_platform_prod -f docker-compose.prod.yml exec -T postgres pg_dump \
  -U service_platform \
  -d service_platform \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_DIR/service_platform_prod_${TIMESTAMP}.sql.gz"
```

**Windows (PowerShell):**

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backups" }
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$outFile = Join-Path $backupDir "service_platform_prod_$timestamp.sql.gz"

docker compose -p service_platform_prod -f docker-compose.prod.yml exec -T postgres `
  pg_dump -U service_platform -d service_platform --no-owner --no-acl |
  gzip > $outFile
```

Copy off-server (example):

```bash
scp "$BACKUP_DIR/service_platform_${TIMESTAMP}.sql.gz" user@backup-host:/backups/
```

### What to back up besides SQL

| Item | Dev | Prod |
|------|-----|------|
| Postgres volume | `service_platform_postgres_data` | `service_platform_postgres_prod_data` |
| Environment | `.env` (secure copy, **not** in git) | same |
| Uploaded files | None in MVP | None in MVP |

---

## Restore Postgres

**Warning: restore is destructive.** It replaces data in the target database. Stop writers first.

### Local dev compose

#### 1. Stop API and web (keep postgres running)

```bash
docker compose stop api web
```

PowerShell:

```powershell
docker compose stop api web
```

#### 2. Restore from `.sql.gz`

**Linux / bash** (replace filename):

```bash
BACKUP_FILE="./backups/service_platform_20260101_120000.sql.gz"

gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql \
  -U service_platform \
  -d service_platform
```

If you need a clean database first:

```bash
docker compose exec -T postgres psql -U service_platform -d postgres -c \
  "DROP DATABASE IF EXISTS service_platform;"
docker compose exec -T postgres psql -U service_platform -d postgres -c \
  "CREATE DATABASE service_platform OWNER service_platform;"

gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql \
  -U service_platform \
  -d service_platform
```

**Windows (PowerShell)** — plain `.sql` if not using gzip:

```powershell
$backupFile = ".\backups\service_platform_20260101_120000.sql"
Get-Content $backupFile | docker compose exec -T postgres psql -U service_platform -d service_platform
```

#### 3. Start services and verify (dev)

```bash
docker compose up -d api web
docker compose exec api alembic upgrade head
curl -s http://localhost:8000/health
docker compose exec api python scripts/check_backend.py   # optional
```

### Production compose

#### 1. Stop writers

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml stop api web
```

#### 2. Restore

```bash
BACKUP_FILE="./backups/service_platform_prod_20260101_120000.sql.gz"

gunzip -c "$BACKUP_FILE" | docker compose -p service_platform_prod -f docker-compose.prod.yml exec -T postgres psql \
  -U service_platform \
  -d service_platform
```

#### 3. Start and verify (prod)

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml up -d api web
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api alembic upgrade head
curl -s http://localhost/health
```

Use `http://localhost:8080/health` if `WEB_HTTP_PORT=8080`.

### After restore (both stacks)

- Test login and one public business page.
- If restore was to match an **older** app version, run the app image from that git commit — do not run new code on an old schema without migrating.

---

## Recommended schedule (production)

| Frequency | Action |
|-----------|--------|
| Daily | `pg_dump` to disk + copy off VPS |
| Before deploy | Manual backup |
| Monthly | Test restore on a staging clone |

Document who owns backups in your runbook. See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

---

## Troubleshooting

| Problem | Hint |
|---------|------|
| `pg_dump: connection refused` | `docker compose ps` — ensure `postgres` is healthy |
| Permission denied on backup dir | `mkdir -p backups && chmod 700 backups` |
| Restore errors on existing DB | Drop/recreate DB or restore to a fresh volume |
| Schema mismatch after restore | Run `alembic upgrade head` or match app version to backup age |

---

## Limitations

- No point-in-time recovery (WAL archiving not configured)
- No encrypted-at-rest backup tooling in repo
- Backup folder `./backups/` is gitignored — keep copies elsewhere
