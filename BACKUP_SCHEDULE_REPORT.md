# Backup Schedule & Retention Report — Phase 7 (Slice 7)

**Purpose:** Document a safe **backup schedule and retention plan** for future VPS deployment.  
**Status:** Planning only — **no cron, systemd timer, or live backup job installed in this slice**.  
**Not in scope:** Real VPS setup, committing backup files, or automated cleanup scripts.

Related: [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) · [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) · [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) · [scripts/backup_postgres.sh](./scripts/backup_postgres.sh)

---

## A. Current status

| Item | Status |
|------|--------|
| **Backup helper** | ✅ `scripts/backup_postgres.sh` |
| **Restore helper** | ✅ `scripts/restore_postgres.sh` (requires `--confirm-destructive`) |
| **Script smoke tests** | ✅ `api/tests/test_backup_scripts.py` |
| **Restore drill checklist** | ✅ [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) |
| **Automated schedule active** | ❌ **Not configured** — must be set on VPS only |
| **Cron / systemd in repo** | ❌ Not installed — examples below are templates |
| **Off-server copy** | ⏳ Planned — not wired |
| **Real restore drill** | ❌ Not performed yet |

---

## B. Recommended backup frequency

| When | Action | Notes |
|------|--------|-------|
| **Daily** | Automated PostgreSQL backup | Run at **low-traffic time** (e.g. 03:00 server local time) |
| **Before every deploy** | Manual backup | Before `git pull`, image rebuild, or `alembic upgrade head` |
| **Before migrations** | Manual backup | Schema changes may not be reversible without a dump |
| **Before risky admin/DB work** | Manual backup | Bulk deletes, data fixes, superadmin operations |
| **Monthly** | Restore drill on staging clone | Per [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) §C |

**Rule:** A backup you have not restored is only a hope — pair schedule with monthly drill practice.

---

## C. Retention policy draft

Adjust for disk cost, legal hold, and data-policy requirements.

| Tier | Keep | Example promotion |
|------|------|-------------------|
| **Daily** | **7 days** | Nightly dump → `daily/`; delete older than 7 days |
| **Weekly** | **4 weeks** | Sunday dump → copy one file to `weekly/`; prune older than 4 |
| **Monthly** | **3–6 months** | First-of-month dump → `monthly/`; prune per policy |

**Minimum:** Always keep the **latest successful backup** until a newer one is verified non-empty.

**Do not** store retention archives inside the git repo.

---

## D. Server backup folder layout

On the VPS — **outside** the git clone:

```text
/opt/service-platform/
  repo/                                    # git clone — no dumps here
  env/
    .env.production                        # chmod 600; never in git
  backups/
    postgres/
      daily/                               # last 7 daily dumps
      weekly/                              # last 4 weekly archives
      monthly/                             # 3–6 month archives
    logs/                                  # backup job stdout/stderr (no secrets)
```

Create once on the VPS:

```bash
sudo mkdir -p /opt/service-platform/backups/postgres/{daily,weekly,monthly}
sudo mkdir -p /opt/service-platform/backups/logs
sudo chown -R deploy:deploy /opt/service-platform/backups
chmod 700 /opt/service-platform/backups/postgres
chmod 700 /opt/service-platform/backups/logs
```

Daily job output example:  
`/opt/service-platform/backups/postgres/daily/service_platform_prod_YYYYMMDD_HHMMSS.sql.gz`

---

## E. Cron option (template — not active)

Install on the **VPS only** after first manual backup succeeds. Use **absolute paths** and a dedicated deploy user.

```cron
# /etc/cron.d/service-platform-backup (example — edit paths; not shipped active)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily at 03:00 server time — low traffic
0 3 * * * deploy /opt/service-platform/repo/scripts/backup_postgres.sh \
  --env-file /opt/service-platform/env/.env.production \
  --backup-dir /opt/service-platform/backups/postgres/daily \
  >> /opt/service-platform/backups/logs/backup_cron.log 2>&1
```

**Safety notes:**

- Call `scripts/backup_postgres.sh` — passwords stay inside the Postgres container
- **Do not** echo or log `.env` contents
- Redirect stdout/stderr to `/opt/service-platform/backups/logs/` — not the repo
- Verify the job user can run `docker compose` (group membership or `sudo` policy documented on server)
- After first scheduled run: `test -s` on the newest `.sql.gz` and check log for `BACKUP_OK`

Weekly/monthly promotion can be a separate cron entry or manual copy — keep promotion logic simple until needed.

---

## F. systemd timer option (alternative template)

Use when you prefer journald logging and explicit service units over cron.

### Service unit idea (`/etc/systemd/system/service-platform-backup.service`)

```ini
# Example only — not installed by this repo
[Unit]
Description=Service Platform PostgreSQL backup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=deploy
Group=deploy
WorkingDirectory=/opt/service-platform/repo
ExecStart=/opt/service-platform/repo/scripts/backup_postgres.sh \
  --env-file /opt/service-platform/env/.env.production \
  --backup-dir /opt/service-platform/backups/postgres/daily
StandardOutput=append:/opt/service-platform/backups/logs/backup_systemd.log
StandardError=append:/opt/service-platform/backups/logs/backup_systemd.log

[Install]
WantedBy=multi-user.target
```

### Timer unit idea (`/etc/systemd/system/service-platform-backup.timer`)

```ini
# Example only — not installed by this repo
[Unit]
Description=Daily Service Platform PostgreSQL backup

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable on VPS after testing:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now service-platform-backup.timer
journalctl -u service-platform-backup.service -n 50 --no-pager
```

**This slice does not ship or enable these units** — copy and adapt on the server.

---

## G. Off-server copy plan

Never rely on backups that exist **only** on the same VPS disk as production.

| Option | Use case | Notes |
|--------|----------|-------|
| **rsync / scp to second server** | Small teams, one extra VPS | SSH key auth; restrict destination user; encrypt in transit (SSH) |
| **S3-compatible object storage** | Durable off-site copy | Versioning + lifecycle rules; IAM key in server env only |
| **Encrypted archive (`gpg`)** | Extra at-rest protection | Encrypt `.sql.gz` before upload; keys off-repo |
| **Provider volume snapshot** | Fast disk-level recovery | Complement — not a substitute for logical `pg_dump` |
| **Managed DB backups** | If Postgres moves off Docker | Use provider PITR when applicable |

**Minimum before launch:** Document **where** off-server copies will go, even if automation comes later.

---

## H. Backup failure alert plan (future)

Monitoring is **not implemented** in this slice. Plan for a later ops slice:

| Check | Action |
|-------|--------|
| **Last backup age** | Alert if no new `.sql.gz` within 26 hours (daily job) |
| **Non-empty file** | Alert if latest dump is 0 bytes or missing |
| **Job log errors** | Grep cron/systemd log for non-zero exit / `BACKUP_FAILED` |
| **Notification channel** | Email or Telegram — configure on VPS; no secrets in repo |
| **Restore drill miss** | Reminder if monthly staging drill not recorded |

Until alerts exist: operator checks backup folder after deploy and weekly.

---

## I. Rotation / cleanup safety

When pruning old dumps on the VPS:

1. **Scope** — delete only under `/opt/service-platform/backups/postgres/{daily,weekly,monthly}/`
2. **Never** run `rm -rf` against repo root, `/`, or Docker volumes
3. **Dry-run first** — `find … -mtime +7 -name '*.sql.gz' -print` before `-delete`
4. **Keep latest successful** — do not delete the newest verified backup
5. **Log deletions** — append to `backups/logs/retention.log` (filenames only, no secrets)
6. **No destructive cleanup script in repo** — operators run explicit commands until a reviewed script exists

Example dry-run (daily tier, older than 7 days):

```bash
find /opt/service-platform/backups/postgres/daily \
  -type f -name 'service_platform_prod_*.sql.gz' -mtime +7 -print
```

---

## J. Launch gate

Before **public launch**, confirm:

- [ ] At least **one manual backup** succeeds on VPS (`backup_postgres.sh` or documented `pg_dump`)
- [ ] At least **one restore drill** succeeds on isolated staging clone — [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md)
- [ ] **Automated schedule** configured (cron or systemd timer) and verified for 2+ runs
- [ ] **Retention** tested — old daily files pruned without touching repo or volumes
- [ ] **Off-server copy** planned or configured (§G)
- [ ] **Failure checks** documented — operator knows how to detect a missed backup (§H)
- [ ] Backup and restore **never** committed to git

---

## Quick reference

| Task | Command / doc |
|------|----------------|
| Manual backup | `./scripts/backup_postgres.sh --env-file /opt/service-platform/env/.env.production` |
| Daily output dir | `/opt/service-platform/backups/postgres/daily/` |
| Job logs | `/opt/service-platform/backups/logs/` |
| Restore drill | [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) |
| Deploy runbook | [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) §G |

---

**Last updated:** Phase 7 Slice 7 — backup schedule and retention plan (no live cron/systemd installed).
