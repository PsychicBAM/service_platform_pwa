# Production checklist

Use this before and after deploying to a VPS. Not every item applies to a private demo server — mark N/A where appropriate.

Related: [DEPLOYMENT.md](./DEPLOYMENT.md), [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)

---

## Security

- [ ] **JWT_SECRET_KEY** is a long random value (≥ 32 bytes), not `change_me`
- [ ] **Postgres password** is strong and matches `DATABASE_URL` in `.env`
- [ ] **`.env` is not in git** and file permissions are restrictive (`chmod 600 .env`)
- [ ] **HTTPS enabled** on public domain (reverse proxy / Cloudflare)
- [ ] **Demo credentials removed** — do not run `seed_demo.py` on real production, or change all demo passwords immediately
- [ ] **Admin and superadmin accounts** reviewed — unique emails, strong passwords, least privilege
- [ ] **CORS_ORIGINS** lists only your real frontend origin(s), not `*`
- [ ] **Public `/docs` decision** — with `APP_ENV=production`, OpenAPI UI is disabled; confirm intentionally
- [ ] **Firewall** — only 80/443 (and SSH) public; block direct `:8000` / `:5173` if proxied
- [ ] **SSH** — key-based auth, non-root deploy user where possible
- [ ] **Docker images** rebuilt after dependency updates

---

## Operations

- [ ] **Backups configured** — daily `pg_dump` per [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)
- [ ] **Backup restore tested** at least once on a non-production clone
- [ ] **Logs reviewed** — `docker compose logs api web` after deploy
- [ ] **Health check** — `/health` returns OK (via proxy and/or direct)
- [ ] **Restart policy** — `restart: unless-stopped` on postgres, api, web
- [ ] **Disk space** — monitor volume growth (`docker system df`, host disk)
- [ ] **Update procedure documented** — git pull, build, migrate (see [DEPLOYMENT.md](./DEPLOYMENT.md))
- [ ] **Rollback plan** — previous git tag + backup restore path understood
- [ ] **Timezone** — `TZ` set consistently for support and booking display

---

## Application (functional)

- [ ] **At least one business** active and visible on public URL
- [ ] **Services configured** — booking and/or order types, prices, descriptions
- [ ] **Schedule configured** — working hours / breaks if using bookings
- [ ] **Public booking flow** tested end-to-end (guest or client)
- [ ] **Public order flow** tested end-to-end
- [ ] **Admin booking flow** — list, confirm, cancel/reschedule as applicable
- [ ] **Admin order flow** — accept, message, complete/decline
- [ ] **Client area** — logged-in client sees bookings/orders at `/me/*`
- [ ] **Superadmin** — platform overview accessible only to superadmin role
- [ ] **Frontend SPA routes** — hard refresh on `/login`, `/admin`, `/b/<slug>` works (nginx fallback)

---

## CI / quality (pre-release)

- [ ] GitHub Actions **backend-tests** green
- [ ] GitHub Actions **frontend-tests** green
- [ ] Local or staging: `pytest`, `check_backend.py`, `e2e_backend_audit.py`
- [ ] Frontend: `npm run test`, `typecheck`, `build`, `check:routes`

---

## Future (not in MVP — track separately)

- [ ] **Payments** (Stripe) — not implemented
- [ ] **Email notifications** (SMTP) — placeholders in `.env.production.example` only
- [ ] **Domain email** (SPF/DKIM for transactional mail)
- [ ] **Monitoring / alerting** (uptime, error tracking, log aggregation)
- [ ] **Automated backups** to object storage
- [ ] **Playwright or smoke tests** against staging URL in CI
- [ ] **Service worker / offline** — intentionally deferred
- [ ] **Mobile wrapper** — intentionally deferred

---

## Quick post-deploy smoke (5 minutes)

1. Open homepage and one public business page
2. Log in as owner → open `/admin` dashboard
3. Log in as client → open `/me/orders` or `/me/bookings`
4. `curl https://your-domain/health`
5. Confirm backup job ran in last 24h

Sign-off:

| Role | Name | Date |
|------|------|------|
| Deploy | | |
| Review | | |
