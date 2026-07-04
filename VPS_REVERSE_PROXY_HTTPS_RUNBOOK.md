# VPS Reverse Proxy & HTTPS Operator Runbook

Operator guide for safely exposing the Service Platform on a VPS with DNS, HTTPS reverse proxy, CORS, and public URL alignment. This is **production operations documentation only** — not automated deployment, not provider-specific setup, and **not** a legal/payment/email compliance guarantee.

**Related:** [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) · [VPS_DRY_RUN_DEPLOYMENT_CHECKLIST.md](./VPS_DRY_RUN_DEPLOYMENT_CHECKLIST.md) · [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) · [docker-compose.prod.yml](./docker-compose.prod.yml) · [.env.production.example](./.env.production.example) · [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) · [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) · [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) · [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md)

---

## A. Current assumptions

| Assumption | Detail |
|------------|--------|
| **Runtime** | App runs via `docker compose -f docker-compose.prod.yml` on a Linux VPS |
| **Backend API** | `api` container listens on **8000** internally; **not** published to the public internet in prod compose (`expose` only) |
| **Frontend** | `web` container nginx listens on **8080** internally; host maps `${WEB_HTTP_PORT:-80}:8080` |
| **Same-origin API (default prod build)** | Production web image is built with `VITE_API_BASE_URL=/api/v1`; container nginx proxies `/api/` → `http://api:8000/api/` |
| **Public traffic** | Should reach the VPS through an **external reverse proxy** that terminates HTTPS |
| **TLS termination** | Recommended at the **host reverse proxy** (nginx, Caddy, Traefik) in front of Docker |
| **Secrets & domains** | Real domains, IPs, certificates, and `.env` values belong **only on the VPS** — never committed |
| **Email / Stripe** | Disabled by default; follow separate runbooks if enabling ([SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md), [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md)) |

**Health endpoints:**

| Path | Served by |
|------|-----------|
| `/health` | API (also proxied through web nginx) |
| `/api/v1/...` | API via web nginx proxy |

---

## B. Required DNS / domain setup

Use **placeholder hostnames** in docs and tickets. Replace with your real domain only on the VPS and in provider dashboards — not in git.

### Recommended (matches production Docker build)

Single public origin — frontend and API share one HTTPS hostname:

| Record | Points to | Example placeholder |
|--------|-----------|---------------------|
| `A` (or `AAAA`) | VPS public IP | `your-domain.example` → `203.0.113.10` (example RFC5737 address — not real) |

Browser calls `https://your-domain.example/api/v1/...` (same origin; no cross-origin API calls in default prod bundle).

### Alternative (split hostnames)

Only if you **rebuild** the web image with a full HTTPS API base URL (e.g. `VITE_API_BASE_URL=https://api.example.com/api/v1`):

| Hostname | Role | Placeholder |
|----------|------|-------------|
| `app.example.com` | Frontend SPA | `https://app.example.com` |
| `api.example.com` | Backend API | `https://api.example.com` |

This requires `CORS_ORIGINS=https://app.example.com` and correct build-time API URL. The **default** `docker-compose.prod.yml` path is **single domain** — prefer that unless you have a strong reason to split.

### DNS checklist

- [ ] `A` / `AAAA` records point to the VPS public IP
- [ ] Propagation verified: `dig +short your-domain.example` (from external network, not only localhost)
- [ ] No real VPS IP or customer domain committed to the repository
- [ ] Stripe/email redirect URLs updated to HTTPS placeholders on VPS (see `.env.production.example`)

---

## C. Required environment variables

Configure in **`.env` on the VPS only** (copy from `.env.production.example`). Placeholders below — never commit real values.

| Variable | Purpose | Placeholder |
|----------|---------|-------------|
| `PUBLIC_APP_URL` | Public frontend base URL (ops reference) | `https://your-domain.example` |
| `PUBLIC_API_URL` | Public API base URL (ops reference) | `https://your-domain.example/api/v1` |
| `CORS_ORIGINS` | Allowed browser origins (comma-separated) | `https://your-domain.example` |
| `WEB_HTTP_PORT` | Host port mapped to web container | `80` (proxy forwards here) |
| `STRIPE_SUCCESS_URL` | Stripe redirect after checkout | `https://your-domain.example/billing/success` |
| `STRIPE_CANCEL_URL` | Stripe redirect on cancel | `https://your-domain.example/billing/cancel` |
| `EMAIL_VERIFICATION_BASE_URL` | Verification link target | `https://your-domain.example/verify-email` |
| `PASSWORD_RESET_BASE_URL` | Reset link target | `https://your-domain.example/reset-password` |
| `API_DOCS_ENABLED` | OpenAPI UI | `false` in production |

**Alignment rules:**

- `CORS_ORIGINS` must list the **exact HTTPS frontend origin** (scheme + host + port if non-default). No `*` in production strict mode.
- `PUBLIC_API_URL` must match how browsers reach the API over HTTPS (default: same domain + `/api/v1`).
- Production frontend must **not** call `http://localhost:8000` — prod build uses relative `/api/v1`.
- `.env` / `.env.production` stays on VPS only — never commit.

**Validate on server (no secrets printed):**

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml exec api \
  python scripts/check_production_env.py --env-file .env --strict
```

---

## D. Reverse proxy architecture

### Recommended: single domain (default prod compose)

```
Internet :443 HTTPS
    │
    ▼
Host reverse proxy (nginx / Caddy / Traefik)
    │  TLS termination, optional HSTS
    │  proxy_pass → 127.0.0.1:${WEB_HTTP_PORT}  (default 80)
    ▼
Docker: web container (nginx :8080)
    ├── /           → SPA static files
    ├── /api/       → proxy to api:8000/api/
    └── /health     → proxy to api:8000/health
    ▼
Docker: api container (:8000, internal only)
    ▼
Docker: postgres (:5432, internal only)
```

### Generic host nginx example (placeholders only)

Replace `your-domain.example` and paths before use. **Do not** paste real certificates or keys into git.

```nginx
# /etc/nginx/sites-available/your-domain.example  (placeholder path)

server {
    listen 80;
    server_name your-domain.example;
    # HTTP → HTTPS redirect (after cert is working)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.example;

    # TLS cert paths — managed by certbot or provider (on VPS only)
    ssl_certificate     /etc/letsencrypt/live/your-domain.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;

    # Forward to Docker web container (WEB_HTTP_PORT default 80)
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The **web container** already proxies `/api/` to the API and adds SPA security headers ([web/nginx.conf](./web/nginx.conf)). The host proxy should **forward** requests without stripping upstream headers.

### Alternative: split `app.example.com` + `api.example.com`

Requires separate upstreams and a **custom web build** with `VITE_API_BASE_URL=https://api.example.com/api/v1`. Not the default `docker-compose.prod.yml` path. If used:

- `app.example.com` → web container port
- `api.example.com` → either dedicated API publish (discouraged) or a second proxy rule to internal API (prefer internal Docker network, not public `:8000`)

---

## E. HTTPS / certificate setup

| Step | Guidance |
|------|----------|
| **Provider** | Let's Encrypt (certbot) or VPS/hosting provider-managed TLS |
| **Port 80** | Required for HTTP-01 challenge unless using DNS-01 |
| **Port 443** | Public HTTPS after certificate issued |
| **Renewal** | Monitor cert expiry (certbot timer or provider alerts); renew before expiry |
| **HSTS** | Enable `Strict-Transport-Security` at reverse proxy **only after** HTTPS works end-to-end for all routes — premature HSTS breaks rollback |
| **Verification** | Do not disable certificate verification in clients or proxies |
| **Mixed content** | All `PUBLIC_*` and Stripe/email URLs must use `https://` |

Example certbot (operator runs on VPS — placeholder domain):

```bash
sudo certbot certonly --nginx -d your-domain.example
```

Reload host nginx after cert issuance. Re-run smoke tests (section G).

---

## F. Security headers / ZAP considerations

| Topic | Status |
|-------|--------|
| **Web container headers** | CSP baseline, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` in [web/nginx.conf](./web/nginx.conf) |
| **Reverse proxy** | Must **not strip** upstream security headers from the web container |
| **CSP after domain change** | Re-test login, register, public flows — `connect-src 'self'` assumes same-origin API |
| **COEP / COOP** | Intentionally **deferred** (documented in [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md)) — do not add without breakage review |
| **HSTS** | Set at reverse proxy when HTTPS stable — see section E |
| **OWASP ZAP** | Re-run baseline against **your owned staging/production HTTPS URL** after deploy — see [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md); workflow is manual/non-blocking |
| **API docs** | `API_DOCS_ENABLED=false` in production — `/docs` must not be public |

---

## G. Health checks and smoke tests

Run on VPS after deploy (replace placeholder domain). **Do not** paste tokens or `.env` in logs.

### Infrastructure

```bash
docker compose -p service_platform_prod -f docker-compose.prod.yml ps
curl -fsS https://your-domain.example/health
curl -fsS https://your-domain.example/api/v1/health   # if exposed via proxy path
```

### Application smoke (browser or curl)

- [ ] Frontend loads over **HTTPS** (`https://your-domain.example/`)
- [ ] No mixed-content warnings in browser devtools
- [ ] Login / register works (CORS not blocking — same-origin default)
- [ ] Public business page loads (`/b/...` if provisioned)
- [ ] Public booking or order flow (guest path)
- [ ] Owner admin dashboard (`/admin`)
- [ ] Superadmin login (`/superadmin`) — trusted operators only
- [ ] Legal/consent pages load (`/legal/terms`, `/legal/privacy`, etc.)
- [ ] API docs **disabled** (`/docs` not publicly usable when `API_DOCS_ENABLED=false`)

### Readiness scripts (no live email/Stripe unless enabled)

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

- Email: follow [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) if enabling
- Stripe: follow [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) — test keys only

---

## H. Firewall

| Rule | Recommendation |
|------|----------------|
| **SSH (22)** | Allow only from trusted admin IPs if possible; key-based auth |
| **HTTP (80)** | Public — required for cert challenges and redirect to HTTPS |
| **HTTPS (443)** | Public — primary user traffic |
| **PostgreSQL (5432)** | **Never** expose publicly — Docker internal network only |
| **API (8000)** | **Do not** publish in prod compose; reverse proxy + web nginx handle traffic |
| **Docker** | Prefer default bridge/internal networking; restrict host port bindings |

Example (ufw placeholders — adjust on VPS):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## I. Rollback

If deploy or proxy config fails:

1. **Disable live modes** if needed: `EMAIL_DRY_RUN=true` / `EMAIL_ENABLED=false`, `STRIPE_ENABLED=false` in VPS `.env`.
2. **Revert reverse proxy** config to previous known-good file; reload nginx/Caddy/Traefik.
3. **Rollback Docker** to previous image tag or git commit:
   ```bash
   git checkout <previous-tag-or-commit>
   docker compose -p service_platform_prod -f docker-compose.prod.yml up -d --build
   ```
4. **Verify health:** `curl -fsS https://your-domain.example/health`
5. **Never delete** Postgres volumes during rollback unless performing an explicit restore from backup — data loss risk.

Keep previous compose project name and backup dumps per [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md).

---

## J. Troubleshooting

| Symptom | Likely cause | What to try |
|---------|--------------|-------------|
| Site unreachable | DNS not propagated | Wait / check `dig`; verify A record |
| Cert challenge failed | Port 80 blocked or wrong `server_name` | Open firewall; fix nginx vhost |
| Browser CORS error | `CORS_ORIGINS` mismatch | Set exact HTTPS frontend origin in `.env`; restart API |
| API calls go to localhost | Wrong build or dev bundle deployed | Rebuild web with `VITE_API_BASE_URL=/api/v1`; use prod compose |
| Mixed content blocked | `http://` URL in env or hardcoded link | Fix `PUBLIC_*`, Stripe, email URLs to HTTPS |
| 502 Bad Gateway | Wrong upstream port | Confirm proxy → `127.0.0.1:${WEB_HTTP_PORT}` and `docker compose ps` |
| Frontend OK, API 404 | Proxy path not forwarded | Ensure full path reaches web container (includes `/api/`) |
| `/admin` 404 on refresh | SPA fallback missing at proxy | Proxy should pass all paths to web nginx (not just `/`) |
| ZAP findings changed | New public URL / headers | Re-triage in [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) |
| Webhook fails (Stripe) | HTTPS URL not reachable externally | Check firewall, proxy, path to `/api/v1/billing/stripe/webhook` |
| WebSockets | **Not used** by this project today | N/A unless future feature adds WS |

---

## K. Operator checklist

### Pre-launch

- [ ] Git working tree clean; CI green (CodeQL, dependency-scan, Trivy, Gitleaks)
- [ ] `.env` created **only on VPS** from `.env.production.example`
- [ ] DNS records point to VPS; propagation verified
- [ ] HTTPS certificate issued and auto-renewal configured
- [ ] Host reverse proxy → Docker `WEB_HTTP_PORT` verified
- [ ] `check_production_env.py --strict` passes on server `.env`
- [ ] `CORS_ORIGINS`, `PUBLIC_APP_URL`, `PUBLIC_API_URL` match final HTTPS domain
- [ ] `API_DOCS_ENABLED=false`
- [ ] Backup plan ready ([BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md))
- [ ] SMTP/Stripe runbooks reviewed; live modes off unless intentionally enabled
- [ ] Legal/privacy review tracked ([LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md))

### Post-launch

- [ ] `/health` returns OK over HTTPS
- [ ] Core smoke flows pass (section G)
- [ ] Logs reviewed — no secrets, JWTs, or full `.env` printed
- [ ] Backup job verified within 24h
- [ ] Monitoring checklist updated ([MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md))
- [ ] Optional: OWASP ZAP baseline on staging HTTPS URL

---

## L. Known limitations

- This runbook **does not** perform deployment automatically — operator executes steps on VPS.
- **No provider-specific** control-panel instructions (DigitalOcean, Hetzner, AWS, Cloudflare, etc.) — adapt generic steps.
- **No guarantee** of legal compliance, payment processing readiness, or email deliverability.
- **Final domain-specific** nginx/Caddy/Traefik config must be reviewed on the server — placeholders are not copy-paste production config without substitution.
- **Split-domain API** requires non-default frontend build — default prod path is single-domain same-origin.
- **COEP/COOP/HSTS** policies may evolve in future security slices — re-check [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) after major header changes.

---

**Last updated:** Phase 8 Slice 4 — VPS reverse proxy & HTTPS operator runbook (docs only; no code changes).
