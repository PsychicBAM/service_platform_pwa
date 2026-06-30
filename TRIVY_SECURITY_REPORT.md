# Trivy Security Report — Phase 6 (Slice 9)

**Purpose:** Document Trivy scanning for **our** repository filesystem, IaC/Docker config, and production Docker images.  
**Not in scope:** OWASP ZAP, Nuclei, aggressive web scanners, third-party sites, pentests, or runtime auth/business-logic testing.

Related: [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [DEPENDENCY_SECURITY_REPORT.md](./DEPENDENCY_SECURITY_REPORT.md) · [.github/workflows/trivy.yml](./.github/workflows/trivy.yml) · [.github/workflows/codeql.yml](./.github/workflows/codeql.yml) · [.github/workflows/dependency-scan.yml](./.github/workflows/dependency-scan.yml)

---

## A. Current Trivy status

| Item | Status |
|------|--------|
| **Workflow** | ✅ `.github/workflows/trivy.yml` |
| **Triggers** | `workflow_dispatch` + weekly Sunday 02:00 UTC |
| **Blocking** | **No** — `continue-on-error: true` on both jobs until baseline is triaged |
| **Secrets** | Not required |
| **SARIF upload** | **Not enabled** (table logs only; avoids code-scanning API permission issues) |
| **Web scanning** | **Not included** — no ZAP/Nuclei/aggressive HTTP probes |

Run manually: GitHub → **Actions** → **Trivy** → **Run workflow**.

---

## B. What is scanned

| Target | Scanner | Scope |
|--------|---------|--------|
| **Repository filesystem** | `trivy fs` | Lockfiles, requirements, package manifests, vendored deps (with skip-dirs for `node_modules`, `dist`, caches) |
| **Config / Dockerfiles** | `trivy config` | `docker-compose*.yml`, `api/Dockerfile`, `web/Dockerfile`, nginx config |
| **Production images** | `trivy image` | `svcplat-api:latest`, `svcplat-web:latest` built from `docker-compose.prod.yml` in CI |

**What Trivy checks:** known CVEs in dependencies and OS packages, misconfigurations, Dockerfile issues, some secret patterns in tracked files.

**What Trivy does not check:** application auth logic, tenant isolation, Stripe webhook correctness, SQL injection in custom queries, live runtime behavior, or third-party websites.

---

## C. How to read results

1. **Severity** — workflow filters **HIGH** and **CRITICAL** only.
2. **Fixed vs unfixed** — `ignore-unfixed: true` in CI hides CVEs with no upstream fix (still review manually if needed).
3. **Runtime vs dev** — findings in `web/node_modules` or test tooling may not affect production nginx `dist/` or API runtime; triage before upgrading.
4. **Docker OS packages** — API image (`python:3.12-slim` + `libpq-dev`) and web image (`nginx:alpine` base) may report base-image CVEs; fix via base image bumps or rebuild when upstream patches.
5. **False positives / accepted risks** — document deferred findings here with reason and review date:

```text
Accepted until YYYY-MM: <package/CVE> — base image OS CVE; no fix in alpine/debian yet; compensating control: rebuild on schedule.
```

---

## D. Local commands

Install [Trivy](https://aquasecurity.github.io/trivy/latest/getting-started/installation/) locally (optional). From project root:

```bash
# Filesystem (dependencies, lockfiles)
trivy fs --severity HIGH,CRITICAL --ignore-unfixed .

# Docker / Compose / Dockerfile misconfigurations
trivy config --severity HIGH,CRITICAL --ignore-unfixed .

# Production images (after build)
docker compose -p svcplat -f docker-compose.prod.yml build api web
trivy image --severity HIGH,CRITICAL --ignore-unfixed svcplat-api:latest
trivy image --severity HIGH,CRITICAL --ignore-unfixed svcplat-web:latest
```

Skip heavy dirs locally if needed:

```bash
trivy fs --skip-dirs node_modules,web/node_modules,web/dist,.git --severity HIGH,CRITICAL .
```

**Do not** paste `.env` contents or secret values into tickets — reference finding IDs and package names only.

---

## E. Relationship to other scanners

| Tool | Focus |
|------|--------|
| **CodeQL** | Custom source-code security patterns |
| **dependency-scan** | npm audit + pip-audit on declared deps (blocking) |
| **Trivy** | Broader CVE/config/secret/image baseline |
| **OWASP ZAP** | Planned later — staging URL only, separate slice |

---

## F. Future plan

| Step | Action |
|------|--------|
| **Slice 9 ✅** | Add non-blocking `trivy.yml` (fs + config + prod image scan) |
| **Next** | Triage first workflow runs; document accepted risks in §C |
| **Later** | Remove `continue-on-error` when baseline is clean and stable |
| **Later** | Optional SARIF upload to GitHub Security tab (after permissions verified) |
| **Later** | OWASP ZAP baseline on owned staging URL only |
| **Not planned here** | Nuclei, exploit tooling, third-party scanning |

---

**Last updated:** Phase 6 Slice 9 — Trivy filesystem and Docker scan baseline.
