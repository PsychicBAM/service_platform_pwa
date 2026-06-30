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

**Last updated:** Phase 6 Slice 3 — dependency security scan baseline.
