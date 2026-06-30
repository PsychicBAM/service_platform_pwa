# Dependency Security Report — Phase 6 (Slice 3)

**Purpose:** Document how to scan **our** frontend and backend dependencies for known vulnerabilities.  
**Scope:** `npm audit` and `pip-audit` commands, triage guidance, and a **blocking** dependency-scan workflow (Phase 6 Slice 8).  
**Not in scope:** OWASP ZAP, Nuclei, aggressive web scanners, automatic `npm audit fix`, or production dependency upgrades without review. **Trivy** baseline is documented in [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) (Slice 9).

Related: [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [.github/workflows/codeql.yml](./.github/workflows/codeql.yml) · [.github/workflows/dependency-scan.yml](./.github/workflows/dependency-scan.yml)

---

## A. Current dependency scan status

| Layer | Tool | Status |
|-------|------|--------|
| **Source code** | CodeQL (`.github/workflows/codeql.yml`) | Active on push/PR to `main` + weekly schedule |
| **Frontend deps** | `npm audit` via `npm run security:audit` | **Blocking** in `dependency-scan.yml`; not in `ci.yml` |
| **Backend deps** | `pip-audit` | **Blocking** in `dependency-scan.yml`; not in `ci.yml` |
| **Docker images** | Trivy | ✅ [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) — `.github/workflows/trivy.yml` (non-blocking baseline) |
| **Staging web app** | OWASP ZAP baseline | Planned later (owned staging URL only) |
| **Secrets in git** | gitleaks / GitHub secret scanning | Planned later |

**Important:** CodeQL analyzes **source code** for security patterns. Dependency audits check **published advisories** against lockfiles/requirements. They are complementary, not interchangeable.

---

## B. Frontend commands

From project root:

```bash
cd web
npm run security:audit
```

Equivalent:

```bash
cd web
npm audit --audit-level=high
```

Broader report (includes moderate):

```bash
cd web
npm audit --audit-level=moderate
```

**Do not** run `npm audit fix` or `npm audit fix --force` blindly — review each advisory, test upgrades, and prefer pinning over major jumps.

`npm run security:audit` is **not** part of normal `ci.yml` (pytest/Vitest/build only). The separate [dependency-scan workflow](./.github/workflows/dependency-scan.yml) runs weekly and on demand — **failures block that workflow** when high+ advisories appear.

---

## C. Backend commands

Run in a **disposable** environment (local venv, CI job, or one-off container). Avoid installing audit tools into the production API image.

```bash
python -m pip install pip-audit
pip-audit -r api/requirements.txt
```

Inside Docker dev API container (audit only, not for production runtime):

```bash
docker compose exec api pip install pip-audit
docker compose exec api pip-audit -r requirements.txt
```

`pip-audit` is **not** listed in `api/requirements.txt` (production runtime). Install on demand.

---

## D. How to triage findings

For each advisory:

1. **Direct vs transitive** — direct deps are easier to upgrade; transitive may need upstream fix or `overrides`/`resolutions` (review carefully).
2. **Runtime vs dev/test** — Vitest, Playwright, Vite dev tooling advisories often do not affect production `npm run build` output; still track and upgrade when practical.
3. **Exploitability in our app** — read CVE/ghsa; many findings require specific APIs or server-side usage we do not use.
4. **Upgrade path** — prefer minor/patch bumps; run `npm run test`, `npm run build`, `pytest`, and `check_backend.py` after changes.
5. **Breaking change risk** — major version bumps need a dedicated PR and manual smoke tests.
6. **Accepted risks** — document in this file or a PR comment when deferring (reason, expiry date, compensating controls).

Example acceptance note format:

```text
Accepted until 2026-Q3: esbuild dev advisory — devDependency only; production bundle uses Vite build output; no runtime esbuild in nginx image.
```

---

## E. Future CI plan

| Step | Action |
|------|--------|
| **Slice 3** | `.github/workflows/dependency-scan.yml` — `workflow_dispatch` + weekly; initially `continue-on-error: true` |
| **Slices 5–7** | Cleared pytest, Starlette, and Vite/esbuild advisories |
| **Slice 8 ✅** | Removed `continue-on-error` — dependency-scan **blocks** on npm/pip-audit failures |
| **Slice 9 ✅** | Trivy fs/config + prod Docker image scan — [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md); non-blocking |
| **Later** | Make Trivy blocking after baseline triage; optional SARIF upload |
| **Later** | OWASP ZAP baseline against **our** staging URL only |
| **Later** | gitleaks or GitHub Advanced Security secret scanning review |

Normal `ci.yml` and CodeQL remain separate — dependency advisories fail **Dependency scan**, not every PR build, unless you also run that workflow on PRs later.

---

## F. Known limitations

- Not a penetration test or runtime web scan.
- Does not validate custom application logic, auth, or tenant isolation (see `check_security_readiness.py` and pytest).
- Does not scan third-party websites or external APIs.
- Does not replace manual code review or CodeQL.
- No legal/privacy pages or 152-FZ compliance in this slice.
- Audit output may list package names and CVE IDs — never paste `.env` values or secrets into tickets.

---

## G. GitHub dependency-scan workflow

**File:** `.github/workflows/dependency-scan.yml`

- Triggers: `workflow_dispatch`, weekly Sunday (same cadence as CodeQL)
- Jobs: frontend `npm audit --audit-level=high`, backend `pip-audit -r api/requirements.txt`
- **Blocking** (Slice 8) — workflow fails if either job reports advisories; no `continue-on-error`
- Separate from `ci.yml` and `codeql.yml`; no secrets required; logs only package/advisory data

Run manually: GitHub → **Actions** → **Dependency scan** → **Run workflow**.

---

## H. Manual scan notes (baseline snapshot)

Run locally when updating this section after dependency changes:

```bash
cd web && npm audit --audit-level=high
pip-audit -r api/requirements.txt
```

Record summary here (counts only — no secret values):

| Scan | Date | High+ | Moderate | Notes |
|------|------|-------|----------|-------|
| `npm audit --audit-level=high` | 2026-06-30 | 1 (vite/esbuild chain) | 1 (esbuild dev server) | devDependency via Vite; fix suggests Vite 8 (breaking); **not** auto-fixed |
| `pip-audit` | 2026-06-30 | 9 advisories | — | `starlette` (FastAPI) + `pytest` in `api/requirements.txt`; triage before upgrade; **not** auto-fixed |
| `pip-audit` | 2026-06-30 (post Slice 5) | 8 advisories | — | **pytest cleared**; `starlette` 0.46.2 only — Slice 6 |
| `pip-audit` | 2026-06-30 (post Slice 6) | **0** | — | **Starlette cleared** — `fastapi` 0.138.2 → `starlette` 1.3.1; Vite/esbuild remains (Slice 7) |
| `npm audit --audit-level=high` | 2026-06-30 (post Slice 7) | **0** | — | **Vite/esbuild cleared** — `vite` 8.1.2; GHSA-67mh-4wv8-2f99 resolved |
| `pip-audit` | 2026-06-30 (post Slice 7) | **0** | — | Backend unchanged; still clean |
| `npm audit` + `pip-audit` | 2026-06-30 (post Slice 8) | **0** / **0** | — | Baseline clean; **dependency-scan now blocking** |
| **Trivy** | 2026-06-30 (Slice 9) | — | — | Workflow added; baseline triage pending; non-blocking |

---

## N. Phase 6 Slice 9 — Trivy filesystem and Docker scan baseline

**Completed:** Defensive scanning workflow + docs only — **no** dependency upgrades, no app product logic changes.

### N.A. Workflow (`.github/workflows/trivy.yml`)

| Job | Scan | Notes |
|-----|------|-------|
| `trivy-fs-config` | `trivy fs` + `trivy config` on repo | HIGH/CRITICAL; `ignore-unfixed: true`; table output |
| `trivy-docker-images` | Build `docker-compose.prod.yml` api/web; `trivy image` | Project `svcplat`; stub `.env` for CI build only |

**Non-blocking:** `continue-on-error: true` on both jobs until baseline triaged. **No SARIF upload.** **No secrets.**

### N.B. Documentation

- [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) — scope, local commands, triage guide

### N.C. Not in scope

- OWASP ZAP, Nuclei, aggressive web scanning, third-party targets, pentests

### N.D. Rollback

Delete `.github/workflows/trivy.yml` and revert doc references.

---

## M. Phase 6 Slice 8 — Blocking dependency-scan workflow

**Completed:** CI hardening only — **no** dependency version changes, no app product logic changes.

### M.A. Workflow change (`.github/workflows/dependency-scan.yml`)

| Before | After |
|--------|-------|
| `continue-on-error: true` on `frontend-audit` and `backend-audit` jobs | **`continue-on-error` removed** — workflow fails on advisories |

**Unchanged:** `workflow_dispatch` + weekly schedule; commands (`npm run security:audit`, `pip-audit -r api/requirements.txt`); separate from `ci.yml` and `codeql.yml`. **Not added:** Trivy, ZAP, gitleaks.

### M.B. Baseline at promotion

- **npm audit (`--audit-level=high`):** 0 vulnerabilities (post Slice 7)
- **pip-audit:** No known vulnerabilities (post Slices 5–6)

### M.C. Operator expectations

- Future high+ npm or pip advisories → **Dependency scan** workflow fails (red) until upgraded or formally accepted and documented in §H
- **CodeQL** remains separate static analysis on source code
- **`ci.yml`** unchanged — default PR CI still pytest + Vitest/build only

### M.D. Rollback

Re-add `continue-on-error: true` to both jobs in `dependency-scan.yml` if a temporary advisory deferral is needed (document reason in §H).

---

## L. Phase 6 Slice 7 — Vite / esbuild upgrade

**Completed:** Frontend devDependency upgrade only — **no** backend, app product logic, auth, or Stripe changes.

### L.A. Compatibility investigation

| Finding | Detail |
|---------|--------|
| **Root cause** | Direct `vite@5.4.21` pulled `esbuild@0.21.5` (≤0.24.2 vulnerable) |
| **Vitest note** | `vitest@4.1.9` already depended on `vite@8.1.0` transitively — duplicate Vite 5 tree triggered npm audit |
| **No Vite 5 patch** | GHSA-67mh-4wv8-2f99 requires esbuild >0.24.2; Vite 5.x pins vulnerable esbuild |
| **Required path** | Vite 8.x + `@vitejs/plugin-react` 6.x (peer `vite ^8.0.0`) |

**Not used:** `npm audit fix --force` — explicit `npm install -D vite@8.1.2 @vitejs/plugin-react@6.0.3` instead.

### L.B. Versions changed (`web/package.json`)

| Package | Before | After | Notes |
|---------|--------|-------|-------|
| `vite` | `^5.4.11` (resolved 5.4.21) | `^8.1.2` (resolved **8.1.2**) | Clears esbuild advisory via Vite 8 toolchain |
| `@vitejs/plugin-react` | `^4.3.4` (resolved 4.7.0) | `^6.0.3` (resolved **6.0.3**) | Required peer for Vite 8 |

**Unchanged:** vitest 4.1.9, jsdom, Playwright, TypeScript, Tailwind, and all runtime `dependencies`. **No** `api/requirements.txt` changes. **No** `vite.config.ts` / `vitest.config.ts` / `playwright.config.ts` changes required.

### L.C. npm audit after Slice 7

- **GHSA-67mh-4wv8-2f99 (esbuild dev server):** cleared
- **`npm run security:audit`:** **0 vulnerabilities** (was 2: 1 moderate + 1 high via Vite chain)
- **esbuild:** Vite 8 declares optional peer `esbuild ^0.27.0 || ^0.28.0` (above vulnerable ≤0.24.2 range)
- **`dependency-scan.yml`:** promoted to **blocking** in Slice 8 (baseline clean after Slices 5–7)

### L.D. Regression

Full frontend + backend suites passed after Docker rebuild; no source or config changes required.

### L.E. Production note

Production Docker `web` image still runs `npm run build` → nginx static `dist/` — no Vite dev server in production. Upgrade reduces dev/CI audit noise and hardens local `npm run dev`.

### L.F. Rollback

Revert `web/package.json` + `web/package-lock.json`; rebuild `web` Docker image.

---

## K. Phase 6 Slice 6 — Starlette / FastAPI runtime upgrade

**Completed:** Runtime dependency upgrade only — **no** app product logic, auth, Stripe, or Vite changes.

### K.A. Compatibility investigation

| FastAPI pin (before) | Starlette constraint | Blocker |
|---------------------|----------------------|---------|
| `>=0.115.0,<0.116.0` (resolved 0.115.14) | `starlette>=0.40.0,<0.47.0` | Caps at 0.46.x — cannot reach patched 0.47.2+ |

FastAPI **0.136.3+** is the first release with `starlette>=0.46.0` and **no upper cap**, allowing Starlette 1.x (required for PYSEC-2026-249 fix at 1.3.1). Intermediate bumps (0.118 → 0.48.x, 0.125 → 0.50.x) would reduce but not clear all pip-audit findings.

### K.B. Versions changed (`api/requirements.txt`)

| Package | Before | After | Notes |
|---------|--------|-------|-------|
| `fastapi` | `>=0.115.0,<0.116.0` (resolved 0.115.14) | `>=0.136.3,<0.139.0` (resolves **0.138.2**) | Smallest range allowing Starlette 1.3.1 |
| `starlette` | 0.46.2 (transitive) | **1.3.1** (transitive) | **Not** pinned explicitly — FastAPI defines compatibility |

**Unchanged:** uvicorn, pydantic, httpx, anyio, pytest, and all other `api/requirements.txt` pins. **No** frontend dependency changes.

### K.C. pip-audit after Slice 6

- **Starlette advisories:** all **8 cleared** (CVE-2025-54121, CVE-2025-62727, CVE-2026-48817/48818, PYSEC-2026-161, PYSEC-2026-248/249)
- **Result:** `pip-audit -r api/requirements.txt` → **No known vulnerabilities found**
- **Remaining:** Vite/esbuild dev-server advisory (frontend) — planned **Slice 7**
- **`dependency-scan.yml`:** remains **non-blocking** until Slice 8 (npm audit still has Vite finding)

### K.D. Regression

Full backend + frontend suites passed after Docker rebuild; **no** test or app code changes required. Verified: auth, admin, billing, Stripe webhook raw body, CORS, TestClient/httpx.

### K.E. VPS readiness

- **Starlette runtime advisories:** acceptable for pre-VPS / production API deployment (subject to normal staging smoke)
- **Rollback:** Revert `fastapi` pin in `api/requirements.txt`; rebuild Docker image

---

## J. Phase 6 Slice 5 — pytest test-only upgrade

**Completed:** Test dependency upgrade only — **no** FastAPI, Starlette, or Vite changes.

### J.A. Versions changed (`api/requirements.txt`)

| Package | Before | After | Reason |
|---------|--------|-------|--------|
| `pytest` | `>=8.3.0,<9.0.0` (resolved 8.4.2) | `>=9.0.3,<10.0.0` (resolves 9.1.1) | CVE-2025-71176 fixed in ≥9.0.3 |
| `pytest-asyncio` | `>=0.24.0,<0.25.0` | `>=1.3.0,<2.0.0` (resolves 1.4.0) | Required — pytest-asyncio 0.24 caps pytest `<9` |

**Unchanged:** FastAPI, Starlette, uvicorn, and all runtime app dependencies.

### J.B. pip-audit after Slice 5

- **pytest advisory:** cleared (CVE-2025-71176)
- **Remaining:** 8 advisories in `starlette@0.46.2` only — planned **Slice 6**
- **Frontend:** Vite/esbuild (GHSA-67mh-4wv8-2f99) unchanged — planned **Slice 7**

### J.C. Regression

Full backend + frontend suites passed after Docker rebuild; no test code changes required.

---

**Last updated:** Phase 6 Slice 7 — Vite / esbuild frontend dependency upgrade.

**Slice type:** Documentation and planning only — **no dependency version changes** in Slice 4.

### I.A. Current scan snapshot

#### Frontend (`npm audit --audit-level=high`)

| Field | Detail |
|-------|--------|
| **Package chain** | `vite@5.4.21` → `esbuild@0.21.5` (devDependencies) |
| **Advisory** | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — esbuild ≤0.24.2; dev server request handling |
| **Severity** | Moderate (esbuild) + high via Vite dependency chain in audit output |
| **Risk** | **Dev server exposure** — affects `npm run dev` / local Vite HMR, not production nginx static bundle |
| **Production impact** | **Lower** — Docker production `web` image runs `npm run build` then serves `dist/` via nginx; Vite dev server is not started in production |
| **npm suggested fix** | `npm audit fix --force` → Vite 8.x (breaking) |
| **Slice 4 action** | **Do not** run `npm audit fix --force`; plan Vite/esbuild upgrade in Slice 7 |

#### Backend (`pip-audit -r api/requirements.txt`)

**pytest@8.4.2** (pinned range `>=8.3.0,<9.0.0` in `api/requirements.txt`)

| Field | Detail |
|-------|--------|
| **Advisory** | CVE-2025-71176 |
| **Fix version** | pytest 9.0.3 |
| **Risk** | **Test-only / CI** — used by pytest in Docker dev/CI image, not application runtime logic |
| **Slice 4 action** | Evaluate upgrade in **Slice 5** (isolated test-deps PR) |

**starlette@0.46.2** (transitive via `fastapi>=0.115.0,<0.116.0`)

| Field | Detail |
|-------|--------|
| **Advisories (pip-audit)** | CVE-2025-54121 (fix 0.47.2), CVE-2025-62727 (fix 0.49.1), CVE-2026-48817 / CVE-2026-48818 (fix 1.1.0), PYSEC-2026-161 (fix 1.0.1), PYSEC-2026-248 (fix 1.3.0), PYSEC-2026-249 (fix 1.3.1) |
| **Risk** | **Runtime** — ASGI stack under FastAPI (routing, middleware, CORS, uploads, TestClient in tests) |
| **Priority** | **Higher than pytest and Vite dev advisory** — review before real VPS/production launch |
| **Slice 4 action** | **Do not** bump Starlette/FastAPI here; plan **Slice 6** compatibility investigation |
| **Compatibility note** | FastAPI 0.115.x pins Starlette 0.46.x; do **not** jump to Starlette 1.x unless FastAPI release supports it |

---

### I.B. Risk classification table

| Advisory area | Package | Current version | Runtime / dev / test | Impact summary | Suggested action | Priority | Blocking before VPS? |
|---------------|---------|-----------------|----------------------|----------------|------------------|----------|----------------------|
| Frontend dev server | esbuild | (Vite 8 peer ≥0.27) | dev | GHSA-67mh-4wv8-2f99 | ✅ **Slice 7 done** — Vite 8.1.2; npm audit clean | — | No |
| Frontend toolchain | vite | 8.1.2 | dev | Was on vulnerable esbuild via Vite 5 | ✅ **Slice 7 done** — explicit upgrade + plugin-react 6.0.3 | — | No |
| Backend runtime | starlette | 1.3.1 | runtime | ASGI layer under FastAPI | ✅ **Slice 6 done** — `fastapi>=0.136.3,<0.139.0` → starlette 1.3.1; pip-audit clean | — | No (advisories cleared) |
| Backend tests | pytest | 9.1.1 | test / CI | CVE-2025-71176 | ✅ **Slice 5 done** — `>=9.0.3,<10.0.0` + pytest-asyncio ≥1.3 | — | No |

---

### I.C. Safe upgrade roadmap (future slices)

Each slice is a **separate PR** with full regression checks. **No automatic `npm audit fix` or blind major bumps.**

#### Slice 5 — pytest test-only upgrade ✅ (completed)

- Bumped `pytest` to `>=9.0.3,<10.0.0` and `pytest-asyncio` to `>=1.3.0,<2.0.0` (required for pytest 9)
- **Regression:** 563 pytest + `check_backend.py` — passed; no test code changes
- **Rollback:** Revert `api/requirements.txt` pins

#### Slice 6 — Starlette / FastAPI compatibility investigation ✅ (completed)

- Upgraded `fastapi` to `>=0.136.3,<0.139.0` (resolves 0.138.2); Starlette 1.3.1 transitive
- **Regression:** 563 pytest + all `check_*.py` audits + Playwright — passed; no code changes
- **pip-audit:** Starlette advisories cleared; Vite/esbuild remains for Slice 7
- **Rollback:** Revert `api/requirements.txt` fastapi pin; rebuild Docker image

#### Slice 7 — Vite / esbuild upgrade investigation ✅ (completed)

- Upgraded `vite` to `^8.1.2` and `@vitejs/plugin-react` to `^6.0.3` (explicit install; no `npm audit fix --force`)
- **Regression:** 74 Vitest + typecheck + build + routes + 22 Playwright + full backend — passed; no config/source changes
- **npm audit:** GHSA-67mh-4wv8-2f99 cleared; `npm run security:audit` → 0 vulnerabilities
- **Rollback:** Revert `web/package.json` + `package-lock.json`; rebuild `web` image

#### Slice 8 — Stricter dependency CI ✅ (completed)

- Removed `continue-on-error` from `dependency-scan.yml` (`frontend-npm-audit`, `backend-pip-audit`)
- Baseline clean: npm audit 0, pip-audit 0
- **Not in scope:** Trivy image scan, OWASP ZAP, gitleaks, adding scans to `ci.yml`
- **Rollback:** Re-add `continue-on-error: true` if temporary advisory deferral needed

**Per-slice checklist (all upgrades):**

1. Create branch; change one dependency area only
2. Run full backend + frontend suites (see DEPENDENCY_SECURITY_REPORT §B–C)
3. `seed_demo.py` after pytest before Playwright
4. Document residual advisories in §H
5. Rollback = `git revert` + rebuild Docker images

---

### I.D. Temporary mitigations (before upgrades)

- **Do not** expose Vite dev server (`npm run dev`) to the public internet — bind localhost only for local dev
- Use **Docker nginx production frontend** (`docker compose` `web` service) for demos/staging static hosting
- Keep **API behind HTTPS reverse proxy** on VPS; do not publish `:8000` publicly
- Keep **Postgres internal** (`docker-compose.prod.yml` — no host port mapping)
- **Do not enable live Stripe** until [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) and [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) are complete
- ~~Treat **Starlette runtime advisories** as launch gate — triage in Slice 6 before pointing production traffic at the API~~ ✅ **Slice 6 done** — Starlette 1.3.1; pip-audit backend clean

---

### I.E. Accepted risk note (Slice 4)

- Dependency findings are **documented and tracked** — not ignored.
- Normal **`ci.yml`** and **CodeQL** remain green; no version bumps in Slice 4.
- **`dependency-scan.yml`** is **blocking** (Slice 8) — fails on high+ npm or pip-audit findings.
- **No** `npm audit fix`, `npm audit fix --force`, or unpinned pip upgrades without compatibility review.
- Re-run §H scans after each future upgrade slice and update this table.

---

**Last updated:** Phase 6 Slice 9 — Trivy filesystem and Docker scan baseline.
