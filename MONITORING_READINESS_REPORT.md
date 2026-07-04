# Monitoring & Logging Readiness Report — Phase 7 (Slice 8)

**Purpose:** Document a practical **monitoring and logging plan** for future VPS production launch.  
**Status:** Planning only — **no live monitoring or alerting configured in this slice**.  
**Not in scope:** Paid monitoring services, VPS deployment, or committing secrets.

Related: [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) · [VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md](./VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md) · [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) · [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [docker-compose.prod.yml](./docker-compose.prod.yml)

---

## A. Current status

| Item | Status |
|------|--------|
| **Live monitoring / alerting** | ❌ Not configured |
| **Health endpoints** | ✅ `GET /health`, `GET /api/v1/health` → `{"status":"ok"}` |
| **nginx health proxy** | ✅ `web` proxies `/health` → API (prod compose) |
| **Docker container healthchecks** | ✅ `postgres` + `api` in `docker-compose.prod.yml` |
| **Docker logs** | ✅ `docker compose logs` available on VPS |
| **Backup schedule** | ⏳ Documented in [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md); not active until VPS setup |
| **Backup freshness monitoring** | ❌ Not automated — future work |
| **Uptime / error alerts** | ❌ Not configured |
| **Log rotation policy** | ⏳ Documented below — not enforced in repo |

---

## B. What must be monitored

| Area | What to watch | When |
|------|---------------|------|
| **Web / SPA** | `GET /` returns 200; static assets load | After deploy; uptime checks |
| **Web health** | `GET /health` via nginx → API | Primary uptime probe |
| **API health** | `GET /api/v1/health` (via proxy or internal) | API-specific probe |
| **Docker containers** | `postgres`, `api`, `web` running and healthy | Daily; after incidents |
| **API error logs** | 5xx, unhandled exceptions, auth failures (no secrets) | Daily review; alert on spike |
| **web / nginx logs** | 4xx/5xx, upstream errors | Daily review |
| **Postgres container** | Health status; connection errors in API logs | Daily |
| **Host disk** | Root filesystem free space | Weekly; alert &gt; 80% |
| **Database volume** | Docker volume growth | Weekly (`docker system df`) |
| **Backup freshness** | Newest `.sql.gz` age | Daily after cron enabled — [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) §H |
| **Backup file size** | Non-zero dump; sudden shrink | After each backup job |
| **SSL certificate** | Expiry date | After HTTPS — alert 14 days before |
| **Domain / DNS** | Resolves to VPS; HTTPS valid | After launch |
| **Stripe webhooks** | Failed deliveries, 4xx/5xx on webhook route; activation stages in [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) | After `STRIPE_ENABLED=true` (test mode first) |
| **SMTP / email** | Send failures, bounce logs; preflight with `check_email_readiness.py`; activation stages in [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) | After `EMAIL_ENABLED=true` (dry-run first) |

**Launch gate:** Monitoring plan reviewed and at least manual health checks documented before public traffic. Legal/privacy pages are a separate launch blocker — [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md).

---

## C. Basic VPS manual checks

Run on the VPS as the **deploy user**. Use placeholders — **do not** print or paste `.env` contents.

```bash
cd /opt/service-platform/repo

# Container status (no secrets in output)
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production ps

# Recent logs — redact before sharing externally
docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production logs --tail=100 api

docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production logs --tail=100 web

docker compose -p service_platform_prod \
  -f docker-compose.prod.yml \
  --env-file /opt/service-platform/env/.env.production logs --tail=100 postgres

# Disk usage
df -h
du -sh /opt/service-platform/backups
docker system df
```

**Safety:** These commands must not echo `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, Stripe keys, or SMTP credentials. If logs might contain tokens, truncate and redact before export.

---

## D. Health check plan

### Expected responses

| Endpoint | How to reach | Expected |
|----------|--------------|----------|
| `GET /` | Public HTTPS URL | HTTP **200**; SPA HTML |
| `GET /health` | Public HTTPS or `http://127.0.0.1:${WEB_HTTP_PORT}/health` on VPS | HTTP **200**; body `{"status":"ok"}` |
| `GET /api/v1/health` | Via nginx if proxied, or API internal | HTTP **200**; body `{"status":"ok"}` |

### Safe curl examples (placeholders)

**Public (after HTTPS):**

```bash
curl -sf -o /dev/null -w "%{http_code}\n" "https://your-domain.example/"
curl -sf "https://your-domain.example/health"
curl -sf "https://your-domain.example/api/v1/health"
```

**On VPS only (localhost — not a substitute for public uptime):**

```bash
curl -sf "http://127.0.0.1:${WEB_HTTP_PORT:-80}/health"
# Expected: {"status":"ok"}
```

**Do not** expose API port `8000` publicly in production compose — health checks should go through `web` nginx or internal probes.

### After deploy smoke

1. All three health checks return **200**
2. JSON body is exactly `{"status":"ok"}` (no stack traces, no env leakage)
3. `docker compose ps` shows `postgres`, `api`, `web` up (healthy where defined)

---

## E. Log policy

| Rule | Detail |
|------|--------|
| **No secrets in logs** | Never log passwords, `password_hash`, JWTs, reset tokens, Stripe keys, SMTP passwords, or raw `.env` values |
| **SQL echo off** | `SQLALCHEMY_ECHO=false` in production `.env` |
| **No verbose SQL** | Do not enable query logging with bind parameters on production |
| **API docs off** | `API_DOCS_ENABLED=false` — reduces accidental exposure in logs/access |
| **Retention** | Keep enough history to debug incidents (e.g. 7–30 days); not indefinite |
| **Rotation** | Use Docker logging driver limits or host `logrotate` later — not configured in repo |
| **Sharing logs** | Redact emails/tokens before support tickets or public posts |
| **Seed script** | Do not run `seed_demo.py` on production; it logs demo account emails (not passwords) |

Validation helpers (no network): `scripts/check_security_readiness.py`, `scripts/check_production_env.py --strict`.

---

## F. Alert plan (future — not active)

Configure **after VPS provision**. No paid service integration in this slice.

| Alert | Trigger (draft) | Channel options |
|-------|-----------------|-----------------|
| **Site down** | Public `GET /health` fails 2+ consecutive checks | Email, Telegram, Uptime Kuma |
| **API health down** | `/api/v1/health` non-200 | Same |
| **Container restarted** | `docker events` or restart count spike | Cron + log grep |
| **Disk high** | Root or `/var/lib/docker` &gt; 80% | Email / Telegram |
| **Backup missing** | No new `.sql.gz` in 26h | See [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) §H |
| **Backup too small** | Latest dump &lt; expected minimum size | Cron check |
| **SSL near expiry** | Certificate &lt; 14 days | `certbot` email or external monitor |
| **Stripe webhook errors** | 5xx on webhook route; Stripe dashboard failures | Log review + Stripe alerts |
| **SMTP failures** | Repeated send errors in API logs | Log review |

**Tool options (later, self-hosted or free tier):**

- **Simple cron + curl + mail/Telegram** — lowest cost; good MVP
- **[Uptime Kuma](https://github.com/louislam/uptime-kuma)** — self-hosted HTTP checks
- **Healthchecks.io / Better Stack / Grafana** — when budget and ops maturity allow

**This slice does not install any of the above.**

---

## G. Incident checklist

When production (or staging) misbehaves:

1. **Record git commit** — `cd /opt/service-platform/repo && git rev-parse HEAD`
2. **Capture container state** — `docker compose … ps` (§C)
3. **Capture recent logs** — `--tail=200` for `api`, `web`, `postgres`; redact secrets
4. **Check disk** — `df -h`, `docker system df`
5. **Check DB health** — postgres container healthy; API `/health` OK
6. **Check latest backup** — newest file in `backups/postgres/daily/`; `test -s` on file
7. **Do not restart blindly** if data corruption suspected — stop writers; assess first
8. **Create backup before risky recovery** — `backup_postgres.sh` if DB still reachable
9. **Document actions** — timeline, symptoms, commands run, resolution
10. **Post-incident** — update runbooks; schedule restore drill if data touched

Escalation: if restore needed, follow [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) on a clone first — not experimental fixes on live data.

---

## H. Future automation plan

| Item | Planned |
|------|---------|
| **Monitoring script** | Localhost + public curl checks; static exit codes; no secrets |
| **Uptime monitor** | Uptime Kuma or cron-based HTTP probe |
| **Docker log rotation** | `json-file` max-size / max-file or host logrotate |
| **Backup freshness checker** | Cron: age + size of latest `.sql.gz` |
| **Alert channel** | Email or Telegram bot (secrets on VPS only) |
| **Dashboard** | Optional Grafana / provider dashboard later |

**This slice is docs-only** — no monitoring scripts added to the repo.

---

## Quick reference

| Check | Command / doc |
|-------|----------------|
| Public health | `curl -sf https://your-domain.example/health` |
| Compose status | `docker compose -p service_platform_prod -f docker-compose.prod.yml ps` |
| API logs | `docker compose … logs --tail=100 api` |
| Disk | `df -h` |
| Backups | `ls -lt /opt/service-platform/backups/postgres/daily/` |
| Deploy smoke | [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) §F |
| Legal / privacy | [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) §H — required before public launch |

---

**Last updated:** Phase 7 Slice 8 — monitoring and logging readiness (no live monitoring configured).
