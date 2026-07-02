# OWASP ZAP Security Report — Phase 6 (Slices 14–19)

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
| **Nginx headers** | Slices 17–19: CSP baseline, cache refinement, `style-src 'self'` (no `unsafe-inline`) |
| **Latest ZAP warnings** | 10027 (likely FP), 10049 (accepted triage), 10109 (accepted), 90004 (deferred); 10055 `unsafe-inline` removed Slice 19 |
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
| 10027 | Information Disclosure - Suspicious Comments | Generated JS bundle / static assets | Low | No block comments in built bundle; likely minified route strings (`forgot-password`, etc.) | Likely false positive — not suppressed | Future review only if sensitive content found |
| 10036 | Server Leaks Version Information via `Server` header | nginx (`web` container) | Low | `Server: nginx` without version after `server_tokens off` (Slice 17) | Fixed (Slice 17) | Re-scan to confirm |
| 10038 | Content Security Policy Header Not Set | HTML responses via nginx | Medium | Conservative CSP added Slice 17; explicit directives added Slice 18 | Fixed (Slices 17–18) | Tighten only if app needs change |
| 10049 | Non-Storable / Cacheable Content | HTML vs `/assets/*` | Low | HTML intentionally `no-store, no-cache`; assets `immutable` long cache; icons/manifest short cache | Accepted — by design | Revisit after production CDN/reverse-proxy policy |
| 10055 | CSP: `style-src` unsafe-inline | HTML CSP header | Low | Slice 19: removed `'unsafe-inline'` — Vite/Tailwind uses external CSS only; no inline `<style>` or `style={{}}` in app | Fixed (Slice 19) | Re-scan to confirm; restore only if UI breaks |
| 10109 | Modern Web Application | SPA (React/Vite) | Informational | Expected for client-rendered app | Accepted risk | No change unless SSR architecture changes |
| 90004 | Cross-Origin-Embedder-Policy Header Missing or Invalid | HTML responses | Low | COEP not required today; can break third-party embeds if added blindly | Accepted risk | Revisit only if SharedArrayBuffer / cross-origin isolation needed |

**Addressed in Slice 17:** `server_tokens off`, conservative CSP, cache headers for HTML vs `/assets/`. **Still deferred:** COEP/COOP/CORP, HSTS (production HTTPS only).

---

## H. Phase 6 Slice 17 — nginx security headers baseline

**Implemented in `web/nginx.conf` (Docker web container, port 8080):**

| Control | Value / behavior |
|---------|------------------|
| `server_tokens` | `off` — `Server` header shows `nginx` without version |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Content-Security-Policy` | `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self';` |
| HTML / SPA fallback | `expires -1` → `Cache-Control: no-cache` |
| `/assets/*` | `expires 1y` → long-lived hashed assets |
| `/icons/*`, manifest | shorter cache (`1d` / `1h`) |

**Not added (intentional):** COEP, COOP, CORP, HSTS on localhost HTTP.

**10027 triage:** Built bundle (`web/dist/assets/*.js`) contains no block comments, license banners, or `sourceMappingURL`. Alert is likely triggered by benign strings in minified route paths (e.g. `password` in `forgot-password`). **Not suppressed** in ZAP rules — document and re-scan after next baseline.

**Verification:** Docker smoke on `http://localhost:5173/` shows CSP + `no-cache` on HTML; `/assets/*` shows `max-age=31536000`; frontend tests and Playwright pass.

---

## I. Phase 6 Slice 18 — CSP and cache header refinement

**CSP additions (ZAP 10055):** explicit `form-action 'self'; frame-src 'none'; child-src 'none'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self'; prefetch-src 'self';` added alongside existing Slice 17 directives.

**HTML cache (ZAP 10049):** SPA routes and `index.html` now send:

- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`
- `Pragma: no-cache`
- `Expires: 0`

**Assets cache:** `/assets/*` sends `Cache-Control: public, max-age=31536000, immutable`.

**Unchanged:** COEP/COOP/CORP deferred; HSTS not on localhost; 10027 not suppressed; 10109 accepted SPA informational.

**Verification:** Docker curl on `/` and `/assets/*`; frontend 74/74; Playwright 22/22; backend suite green.

---

## J. Phase 6 Slice 19 — Final CSP/cache triage

### CSP: `style-src` without `unsafe-inline`

**Change:** `style-src 'self' 'unsafe-inline'` → `style-src 'self'`.

**Rationale:** Production build uses hashed external CSS (`/assets/*.css`) from Tailwind/Vite. Source review found no inline `<style>` tags or React `style={{}}` props. Playwright (22/22), Vitest (74/74), and Docker nginx smoke pass with the stricter policy.

**ZAP 10055 (`unsafe-inline`):** addressed by this change; manual baseline re-run recommended to confirm.

### Cache triage (ZAP 10049)

| Path | Observed headers | Decision |
|------|------------------|----------|
| `/` (HTML) | `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`; `Pragma: no-cache`; `Expires: 0` | Intentional — SPA shell must not be cached |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` | Intentional — hashed build assets |
| `/icons/icon.svg` | `Cache-Control: max-age=86400` | Low-risk short cache |
| `/manifest.webmanifest` | `Cache-Control: max-age=3600` | Low-risk short cache |
| `/robots.txt`, `/sitemap.xml` | SPA fallback → same HTML no-store headers (files not deployed yet) | Acceptable; add static files later if needed |

**Decision:** Do not chase 10049 to zero. Mixed cache policy (no-store HTML + long-cache assets) is correct for this SPA. Revisit after production CDN/reverse-proxy configuration.

### Suspicious comments triage (ZAP 10027)

**Review (`web/dist/assets/*.js` after `npm run build`):**

- No `//` or `/*` block comments
- No `sourceMappingURL`
- No `TODO` / `FIXME`
- No credential-like strings in comments (bundle is comment-free minified output)

**Decision:** Likely false positive (ZAP heuristic on minified JS). **Not suppressed** in `.zap/rules.tsv` unless repeated noise with no sensitive content on future baselines.

### Remaining accepted/deferred warnings

| ZAP ID | Decision |
|--------|----------|
| 10109 Modern Web Application | Accepted — expected SPA informational |
| 90004 COEP missing | Deferred — not required; can break embeds |

**ZAP workflow:** remains manual `workflow_dispatch`, non-blocking.

---

## K. CI plan

| Phase | Plan |
|-------|------|
| **Slice 15 (implemented)** | `.github/workflows/zap-baseline.yml` — `workflow_dispatch` only, **non-blocking**, starts `docker compose`, baseline target `http://localhost:5173`, unauthenticated/public-only |
| **Slice 16 (implemented)** | Report artifact fix (action default `report_*` files); first baseline triage documented (0 FAIL, 6 WARN) |
| **Slice 17 (implemented)** | nginx `server_tokens off`, conservative CSP, cache headers; re-baseline recommended after push |
| **Slice 18 (implemented)** | CSP explicit directives (10055 fallback); HTML `no-store` cache; assets `immutable` long cache |
| **Slice 19 (implemented)** | Removed `style-src 'unsafe-inline'`; final 10049/10027 triage documented |
| **After staging VPS** | Optional manual or scheduled baseline against **our** HTTPS staging URL |
| **Later** | Authenticated scan only if safe test accounts and scope are defined |
| **Blocking promotion** | Only after several clean baselines on staging; never block on flaky dev-only findings |

Gitleaks, Trivy, CodeQL, and dependency-scan remain separate blocking workflows.

---

**Last updated:** Phase 6 Slice 19 — final ZAP CSP/cache triage; `style-src` without `unsafe-inline`.
