# Dependency Security Report — Phase 6 (Slice 3)

**Purpose:** Document how to scan **our** frontend and backend dependencies for known vulnerabilities.  
**Scope:** `npm audit` and `pip-audit` commands, triage guidance, and a non-blocking CI workflow.  
**Not in scope:** OWASP ZAP, Nuclei, Trivy, aggressive web scanners, automatic `npm audit fix`, or production dependency upgrades without review.

Related: [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [.github/workflows/codeql.yml](./.github/workflows/codeql.yml) · [.github/workflows/dependency-scan.yml](./.github/workflows/dependency-scan.yml)

---

## A. Current dependency scan status

| Layer | Tool | Status |
|-------|------|--------|
| **Source code** | CodeQL (`.github/workflows/codeql.yml`) | Active on push/PR to `main` + weekly schedule |
| **Frontend deps** | `npm audit` via `npm run security:audit` | Documented; **not** in blocking `ci.yml` |
| **Backend deps** | `pip-audit` (manual / optional workflow) | Documented; **not** in blocking `ci.yml` |
| **Docker images** | Trivy | Planned later |
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

`npm run security:audit` is **not** part of normal CI (`ci.yml`) so existing dev-dependency advisories do not block merges. Use the optional [dependency-scan workflow](./.github/workflows/dependency-scan.yml) or run locally before releases.

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
| **Now (Slice 3)** | Optional `.github/workflows/dependency-scan.yml` — `workflow_dispatch` + weekly; `continue-on-error: true` |
| **Next** | Review scan logs; fix or accept findings; document accepted risks here |
| **Later** | Make dependency scan **blocking** only after baseline is clean |
| **Later** | Trivy on `api` and `web` Docker images / filesystem |
| **Later** | OWASP ZAP baseline against **our** staging URL only |
| **Later** | gitleaks or GitHub Advanced Security secret scanning review |

Normal `ci.yml` stays green — dependency noise does not fail PRs until explicitly promoted.

---

## F. Known limitations

- Not a penetration test or runtime web scan.
- Does not validate custom application logic, auth, or tenant isolation (see `check_security_readiness.py` and pytest).
- Does not scan third-party websites or external APIs.
- Does not replace manual code review or CodeQL.
- No legal/privacy pages or 152-FZ compliance in this slice.
- Audit output may list package names and CVE IDs — never paste `.env` values or secrets into tickets.

---

## G. Optional GitHub workflow

**File:** `.github/workflows/dependency-scan.yml`

- Triggers: `workflow_dispatch`, weekly Sunday (same cadence as CodeQL)
- Jobs: frontend `npm audit --audit-level=high`, backend `pip-audit -r api/requirements.txt`
- `continue-on-error: true` on both jobs — workflow may show yellow/warning but does not block merges
- No secrets required; logs only

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

---

## I. Phase 6 Slice 4 — advisory triage

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
| Frontend dev server | esbuild | 0.21.5 | dev | Malicious site could read Vite dev server responses if dev server is exposed | Do not expose `npm run dev` to internet; use nginx prod frontend for demos; upgrade in Slice 7 | Medium | No (if dev server not public) |
| Frontend toolchain | vite | 5.4.21 | dev | Depends on vulnerable esbuild; audit fix wants Vite 8 | Investigate non-breaking Vite patch/minor path in Slice 7; avoid `--force` | Medium | No (prod serves static `dist/`) |
| Backend runtime | starlette | 0.46.2 | runtime | Multiple CVEs in ASGI layer used by FastAPI | Minimum safe Starlette/FastAPI compatible upgrade in Slice 6; full auth/billing/e2e regression | **High** | **Yes — review before production** |
| Backend tests | pytest | 8.4.2 | test / CI | CVE in test framework | Upgrade to 9.0.3+ in Slice 5; run full pytest + `check_backend.py` | Low–medium | No (test-only) |

---

### I.C. Safe upgrade roadmap (future slices)

Each slice is a **separate PR** with full regression checks. **No automatic `npm audit fix` or blind major bumps.**

#### Slice 5 — pytest test-only upgrade

- Bump `pytest` (and `pytest-asyncio` if required) to fixed versions within compatibility
- **Commands:** `docker compose exec api python -m pytest`, `check_backend.py`, `e2e_backend_audit.py`
- **Risk:** Low app risk — test tooling only
- **Rollback:** Revert `api/requirements.txt` pin

#### Slice 6 — Starlette / FastAPI compatibility investigation

- Inspect FastAPI 0.115.x ↔ Starlette compatibility matrix
- Try **minimum** safe patch/minor that resolves highest-priority CVEs (e.g. 0.47.2+ within FastAPI support — verify before applying)
- **Do not** jump to Starlette 1.x unless FastAPI officially supports it
- **Regression:** pytest (auth, admin, billing, webhooks, CORS, uploads), `check_security_readiness.py`, manual smoke on staging
- **Rollback:** Revert FastAPI/Starlette pins; redeploy previous image

#### Slice 7 — Vite / esbuild upgrade investigation

- Review Vite 5 → 6/7/8 changelog; avoid `npm audit fix --force`
- Try smallest compatible Vite/esbuild bump that clears GHSA-67mh-4wv8-2f99 if available
- **Regression:** `npm run test`, `typecheck`, `build`, `check:routes`, `test:e2e`
- **Rollback:** Revert `web/package.json` + `package-lock.json`

#### Slice 8 — Stricter dependency CI

- Remove `continue-on-error` from `dependency-scan.yml` only after advisories are resolved or formally accepted
- Optionally fail `ci.yml` on high/critical only
- Add Trivy image scan when ready

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
- Treat **Starlette runtime advisories** as launch gate — triage in Slice 6 before pointing production traffic at the API

---

### I.E. Accepted risk note (Slice 4)

- Dependency findings are **documented and tracked** — not ignored.
- Normal **`ci.yml`** and **CodeQL** remain green; no version bumps in Slice 4.
- **`dependency-scan.yml`** remains **non-blocking** (`continue-on-error: true`) until Slice 8.
- **No** `npm audit fix`, `npm audit fix --force`, or unpinned pip upgrades without compatibility review.
- Re-run §H scans after each future upgrade slice and update this table.

---

**Last updated:** Phase 6 Slice 4 — dependency advisory triage and safe upgrade plan.
