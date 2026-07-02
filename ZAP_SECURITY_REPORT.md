# OWASP ZAP Security Report — Phase 6 (Slices 14–16)

**Purpose:** Document safe, defensive **readiness** for OWASP ZAP baseline (passive) scanning of **our** application only.  
**Not in scope:** Aggressive scans, authenticated admin scans, third-party targets, Nuclei, exploit tooling, or legal/privacy pages.

Related: [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) · [SECRETS_SCAN_REPORT.md](./SECRETS_SCAN_REPORT.md)

---

## A. Current status

| Item | Status |
|------|--------|
| **ZAP in CI** | ✅ `.github/workflows/zap-baseline.yml` — manual `workflow_dispatch`, **non-blocking** |
| **External targets** | **None scanned** — no VPS/staging URL yet |
| **Allowed targets** | **Owned local Docker app** (`localhost`) or **our HTTPS staging** after deploy |
| **Scan mode** | **Baseline / passive only** — no active attack, no authenticated admin routes in this slice |
| **Workflow** | Slice 15 baseline workflow; Slice 16 artifact/report fix (action default `report_*` files) |
| **First baseline** | **0 FAIL-NEW**, **6 WARN-NEW**, **61 PASS** (manual run, localhost) |
| **Nuclei** | Not planned in this slice |

**Rule:** Never scan third-party sites, customer domains, or production without explicit operator approval and a scoped URL list.

---

## B. What ZAP baseline checks

OWASP ZAP **baseline** (passive spider + passive rules) can surface issues such as:

- Missing or weak **security headers** (CSP, HSTS on HTTPS, X-Frame-Options, etc.)
- **Cookie** flags (`Secure`, `HttpOnly`, `SameSite`) on responses that set cookies
- **Mixed content** references (HTTP assets on HTTPS pages)
- **Information disclosure** in headers or error pages (limited passive checks)
- Common **misconfiguration** patterns detectable without exploitation

**What it is not:** a full penetration test, business-logic review, or replacement for auth/tenant isolation tests in pytest/Playwright.

---

## C. What ZAP baseline does not replace

| Tool / practice | Role |
|-----------------|------|
| **CodeQL** | Static analysis on Python/JS source |
| **dependency-scan** | npm audit + pip-audit advisories |
| **Trivy** | CVEs, Dockerfile/config, container images |
| **Gitleaks** | Secrets in git history and tracked files |
| **Manual auth/role checks** | [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) §E |
| **Tenant isolation** | pytest + manual API review |
| **Legal / privacy** | Future work — Terms, Privacy Policy, consent |
| **Professional pentest** | External engagement before high-risk launch |

ZAP is **dynamic web** scanning (HTTP responses in a browser-like client). It complements but does not duplicate static scanners.

---

## D. Safe local manual run

Use only when the stack is running on **your machine**. Do not paste tokens, passwords, or `.env` values into ZAP or reports.

### 1. Start stack

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
```

### 2. Seed demo (public pages + login form; no admin scan in this slice)

```bash
docker compose exec api python scripts/seed_demo.py
```

Demo credentials are documented in [README_BACKEND.md](./README_BACKEND.md). **Do not** configure ZAP with demo passwords for this slice.

### 3. Confirm targets (owned URLs only)

| URL | Purpose |
|-----|---------|
| `http://localhost:5173` | Platform home (via nginx in `web` container) |
| `http://localhost:5173/health` | Health proxy → API (smoke check) |
| `http://localhost:5173/b/demo-business` | Public business page |
| `http://localhost:5173/login` | Login page (unauthenticated) |

API direct (optional smoke, not required for ZAP baseline): `http://localhost:8000/health`

### 4. Run ZAP baseline (passive, local app only)

Install [OWASP ZAP](https://www.zaproxy.org/) locally **or** use the official Docker image. Example placeholders — adjust host/port for your OS/Docker networking:

**Docker (Linux / macOS / Windows with `host.docker.internal`):**

```bash
# Scan public home only — expand -t only to owned public paths you intend to test
docker run --rm -t owasp/zap2docker-stable zap-baseline.py \
  -t http://host.docker.internal:5173/ \
  -r report_html.html -J report_json.json -w report_md.md \
  -I
```

**PowerShell note:** If `host.docker.internal` is unavailable, use your host LAN IP or Docker Desktop’s host gateway; keep `-t` on **localhost-owned** ports only.

**Scope for Slice 14:**

- **In scope:** public landing, public business pages, login/register shells (unauthenticated).
- **Out of scope:** `/admin`, `/superadmin`, authenticated sessions, Stripe webhooks, destructive forms.

Do **not** enable aggressive scan policies, full active scan, or fuzzing against local or staging URLs in this phase.

### 5. Review output

- Save HTML/JSON reports locally; do not commit scan artifacts with session cookies.
- Triage per §F; fix headers/CSP/CORS only after review against the Vite bundle.

---

## E. Future staging run

After VPS deploy with **our** HTTPS domain:

1. Confirm staging is **our** environment (not production customer data unless approved).
2. Run **baseline** against `https://staging.your-domain.example/` public pages first.
3. Expand scope slowly (e.g. `/b/demo-business` on staging).
4. **Authenticated scans** — separate slice, separate policy, test accounts only; never use production admin credentials in ZAP.
5. **Production:** avoid destructive or high-rate scans; prefer read-only baseline on a subset of public URLs, off-peak, with rollback plan.
6. **Never** point ZAP at third-party APIs, payment provider dashboards, or unrelated domains.

---

## F. Triage policy

For each ZAP alert:

| Classification | Action |
|----------------|--------|
| **Real issue** | File fix (e.g. header hardening in `web/nginx.conf`); re-run baseline to confirm |
| **Accepted risk** | Document in this file or issue tracker with rationale and expiry review date |
| **False positive** | Note rule ID and why (e.g. dev-only HTTP, intentional OpenAPI in local) — do not blanket-disable rules |

**Priority:**

- **High / Medium** — review before production; map to nginx/CORS/CSP/config changes where appropriate.
- **Low / Informational** — batch review; many are dev-environment noise (no HSTS on `http://localhost`).

**Do not** blindly suppress alerts in ZAP without recording the decision. CSP changes must be validated against the production Vite bundle (deferred in [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md)).

---

## G. Phase 6 Slice 16 — First ZAP baseline findings

**Run summary (manual `workflow_dispatch`, `http://localhost:5173`, unauthenticated):**

| Metric | Count |
|--------|------:|
| FAIL-NEW | 0 |
| WARN-NEW | 6 |
| PASS | 61 |

**Artifact fix (Slice 16):** workflow uses the action default report files (`report_html.html`, `report_json.json`, `report_md.md`) and uploads those files (`if-no-files-found: warn`) to avoid filename mismatch failures.

| ZAP ID | Alert | Affected area | Severity | Initial assessment | Decision | Future action |
|--------|-------|---------------|----------|-------------------|----------|---------------|
| 10027 | Information Disclosure - Suspicious Comments | Generated JS bundle / static assets | Low | May flag build comments in Vite output; inspect bundle for sensitive strings | Investigate before suppress | Review `web/dist` output; suppress only if confirmed benign |
| 10036 | Server Leaks Version Information via `Server` header | nginx (`web` container) | Low | `Server: nginx` visible; version string may leak | Actionable hardening | Future slice: `server_tokens off;` in `web/nginx.conf` and re-scan |
| 10038 | Content Security Policy Header Not Set | HTML responses via nginx | Medium | CSP intentionally deferred pending Vite bundle validation | Planned fix | Future slice: conservative CSP in nginx; test all routes before enable |
| 10049 | Storable and Cacheable Content | Static assets (`/assets/*`) | Low | Hashed JS/CSS should be cacheable; HTML should not be long-cached | Partial accept | Future slice: `Cache-Control` for `index.html` vs assets |
| 10109 | Modern Web Application | SPA (React/Vite) | Informational | Expected for client-rendered app | Accepted risk | No change unless SSR architecture changes |
| 90004 | Cross-Origin-Embedder-Policy Header Missing or Invalid | HTML responses | Low | COEP not required today; can break third-party embeds if added blindly | Accepted risk | Revisit only if SharedArrayBuffer / cross-origin isolation needed |

**Not changed in Slice 16:** CSP, COEP, cache headers, `server_tokens off` — header hardening is a separate slice after bundle review.

---

## H. CI plan

| Phase | Plan |
|-------|------|
| **Slice 15 (implemented)** | `.github/workflows/zap-baseline.yml` — `workflow_dispatch` only, **non-blocking**, starts `docker compose`, baseline target `http://localhost:5173`, unauthenticated/public-only |
| **Slice 16 (implemented)** | Report artifact fix (action default `report_*` files); first baseline triage documented (0 FAIL, 6 WARN) |
| **After staging VPS** | Optional manual or scheduled baseline against **our** HTTPS staging URL |
| **Later** | Authenticated scan only if safe test accounts and scope are defined |
| **Blocking promotion** | Only after several clean baselines on staging; never block on flaky dev-only findings |

Gitleaks, Trivy, CodeQL, and dependency-scan remain separate blocking workflows.

---

**Last updated:** Phase 6 Slice 16 — ZAP artifact fix and first baseline triage (0 FAIL, 6 WARN).
