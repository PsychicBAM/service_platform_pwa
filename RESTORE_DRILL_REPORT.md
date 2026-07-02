# Restore Drill Report — Phase 7 (Slice 6)

**Purpose:** Document a **safe staging restore drill** so backups can be proven usable before public launch.  
**Status:** Documentation only — **no real restore performed in this slice**.  
**Not in scope:** Live production restore, committing backup files, or automated drill scheduling.

Related: [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) · [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) · [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [scripts/restore_postgres.sh](./scripts/restore_postgres.sh)

---

## A. Current status

| Item | Status |
|------|--------|
| **Backup helper** | ✅ `scripts/backup_postgres.sh` |
| **Restore helper** | ✅ `scripts/restore_postgres.sh` (requires `--confirm-destructive`) |
| **Script smoke tests** | ✅ `api/tests/test_backup_scripts.py` — behavior only; no real dump/restore |
| **Automated backup schedule** | ❌ Not implemented |
| **Real restore drill performed** | ❌ **Not done yet** |
| **Staging restore drill before launch** | ⏳ **Required** — use this report on an isolated clone |

---

## B. Why restore drill matters

A backup file is only useful if it can be **restored successfully** into a running stack.

| Risk | Why drill helps |
|------|-----------------|
| **Failed migrations** | Prove you can roll back data, not just code |
| **VPS disk / volume loss** | Confirm off-repo backups are valid and complete |
| **Human error** | Practice destructive restore on staging, not production |
| **Schema drift** | Learn whether `alembic upgrade head` is needed after restore |
| **Time to recover** | Record how long restore + smoke tests take |

**Rule:** Run the drill on **staging or a disposable clone** — never the first attempt on production traffic.

---

## C. Safe staging restore drill plan

Use a **separate** host, compose project, or volume from production. Example layout:

```text
/opt/service-platform-staging/
  repo/
  env/.env.staging          # staging secrets only — never production
  backups/postgres/         # copy one .sql.gz here for the drill
```

### Step-by-step (staging / disposable clone only)

| # | Step | Notes |
|---|------|--------|
| 1 | **Prepare staging** | New VPS, local prod-compose clone with **different** project name/volume, or disposable VM |
| 2 | **Do not use production DB** | Different `POSTGRES_*`, volume name, and hostname; no DNS to public prod |
| 3 | **Copy backup file** | `scp` or secure copy to `backups/postgres/` on staging — **do not** commit `.sql.gz` to git |
| 4 | **Start staging stack** | `docker compose -p service_platform_staging -f docker-compose.prod.yml up -d` with staging `.env` |
| 5 | **Restore backup** | See command template below — `--confirm-destructive` required |
| 6 | **Run migrations if needed** | `alembic upgrade head` after restore if app commit is newer than backup |
| 7 | **Health checks** | `GET /health`, `GET /api/v1/health` on staging URL |
| 8 | **Login smoke** | Owner, client, superadmin test accounts — do not log tokens |
| 9 | **Public smoke** | Booking and order flows on a test business slug |
| 10 | **Data review** | Spot-check businesses, services, bookings/orders count vs expectations |
| 11 | **Tear down or isolate** | Destroy staging volume/VM when done, or firewall from public internet |

### Restore command template (staging only)

```bash
cd /opt/service-platform-staging/repo

./scripts/restore_postgres.sh \
  --env-file /opt/service-platform-staging/env/.env.staging \
  --backup-file /opt/service-platform-staging/backups/postgres/service_platform_prod_YYYYMMDD_HHMMSS.sql.gz \
  --stop-writers \
  --confirm-destructive
```

Passwords are handled **inside** the Postgres container — do not pass `POSTGRES_PASSWORD` on the CLI or print env files.

### After restore

```bash
docker compose -p service_platform_staging -f docker-compose.prod.yml up -d api web
docker compose -p service_platform_staging -f docker-compose.prod.yml exec api alembic upgrade head
curl -sf "http://127.0.0.1:${WEB_HTTP_PORT:-80}/health"
```

Manual detail: [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) §G.

---

## D. Pre-restore checklist

Complete **before** running `restore_postgres.sh` on staging:

- [ ] **Target is staging** — not production hostname, volume, or public DNS
- [ ] **Backup file path confirmed** — correct `.sql.gz`; file is non-empty (`test -s`)
- [ ] **Staging DB may be destroyed** — volume is disposable or already backed up
- [ ] **`.env` is staging** — `APP_ENV=production` OK on staging host, but DB/credentials are **not** production
- [ ] **No accidental live email** — `EMAIL_ENABLED=false` or `EMAIL_DRY_RUN=true` on staging
- [ ] **No accidental live Stripe** — `STRIPE_ENABLED=false` or test mode only on staging
- [ ] **Git commit recorded** — `git rev-parse HEAD` noted for app image used during drill
- [ ] **Maintenance window** — no users on this staging instance during restore
- [ ] **Second backup** — optional snapshot of staging DB before overwrite if re-testing

---

## E. Post-restore validation checklist

Run on **staging HTTPS or localhost** after restore and migrations:

| # | Check | Pass |
|---|--------|------|
| 1 | `GET /health` — nginx → API OK | ☐ |
| 2 | `GET /` — SPA loads | ☐ |
| 3 | `GET /api/v1/health` | ☐ |
| 4 | Login **owner** → `/admin` | ☐ |
| 5 | Login **client** → `/me/bookings` or `/me/orders` | ☐ |
| 6 | Login **superadmin** → platform businesses | ☐ |
| 7 | Admin **services** list loads | ☐ |
| 8 | **Public booking** flow (guest or client) | ☐ |
| 9 | **Order / message** thread smoke | ☐ |
| 10 | **Email** — `EMAIL_DRY_RUN=true` or disabled; no live SMTP sends | ☐ |
| 11 | **Stripe** — disabled or test mode only; no live charges | ☐ |

Optional backend audits on staging:

```bash
docker compose -p service_platform_staging -f docker-compose.prod.yml \
  exec api python scripts/check_security_readiness.py
docker compose -p service_platform_staging -f docker-compose.prod.yml \
  exec api python scripts/e2e_backend_audit.py
```

Do not log JWTs, passwords, or webhook secrets during the drill.

---

## F. Restore failure handling

If restore or post-restore smoke fails on **staging**:

1. **Stop app writers** — `docker compose ... stop api web`
2. **Do not retry blindly on production** — diagnose on staging clone first
3. **Save logs** — `docker compose logs postgres api` (redact secrets before sharing)
4. **Verify backup integrity** — file size, `gunzip -t backup.sql.gz`, try older backup
5. **Check migration state** — `alembic current` vs app git commit age
6. **Restore from older backup** if the dump is corrupt or incomplete
7. **Document incident** — date, backup filename, error codes, resolution

If restore fails on **production** (future): treat as incident — engage maintenance window, use last known-good backup, do not experiment on live data.

---

## G. Future automation

| Item | Planned |
|------|---------|
| **Scheduled backups** | [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) — cron/systemd templates; configure on VPS only |
| **Off-server copy** | `scp`, `rsync`, or object storage |
| **Retention policy** | 7 daily, 4 weekly, 3–6 monthly — see schedule report §C |
| **Monthly restore drill** | Repeat §C on disposable staging |
| **Backup failure alerts** | monitoring if dump missing or zero-byte |
| **Encryption at rest** | `gpg` or provider-side encryption for `.sql.gz` |

**This slice does not enable automation** — operators follow manual checklists until a future slice.

---

## Local disposable clone (optional practice)

For **documentation practice only** — not required for Slice 6 acceptance:

```bash
# Separate compose project + volume — NOT your dev database if it has data you need
WEB_HTTP_PORT=8090 docker compose -p service_platform_drill \
  -f docker-compose.prod.yml --env-file .env.production.example up -d

# Create a backup from drill stack, then practice restore on a fresh volume
# Destroy when done: docker compose -p service_platform_drill down -v
```

**Do not** run `restore_postgres.sh` against your active `docker compose` dev database in CI or shared environments.

---

**Last updated:** Phase 7 Slice 7 — cross-link to [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) (no live schedule installed).
