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
| **Blocking** | **Yes** — Slice 12; HIGH/CRITICAL findings fail the workflow (no `continue-on-error`) |
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
| **Slice 10 ✅** | First green run triaged — see §G; CVE baseline clean; config hardening deferred |
| **Slice 11 ✅** | Non-root `USER` in api/web Dockerfiles; nginx listens on **8080** internally — DS-0002 resolved |
| **Slice 12 ✅** | Baseline clean; `continue-on-error` removed — Trivy is **blocking** |
| **Later** | Optional SARIF upload to GitHub Security tab (after permissions verified) |
| **Later** | OWASP ZAP baseline on owned staging URL only |
| **Not planned here** | Nuclei, exploit tooling, third-party scanning |

---

## G. Phase 6 Slice 10 — Trivy findings triage

**Reviewed:** Latest green **Trivy** workflow run (post `@v0.36.0` action fix), cross-checked locally with Trivy 0.36 / latest matching CI flags (`HIGH,CRITICAL`, `ignore-unfixed`, same skip-dirs).  
**Method:** GitHub Actions logs (workflow green); local `trivy fs`, `trivy config`, `trivy image` on `svcplat-api:latest` / `svcplat-web:latest` built from `docker-compose.prod.yml`.

### G.A. Latest run status

| Job / step | Workflow result | HIGH/CRITICAL findings | Secrets |
|------------|-----------------|-------------------------|---------|
| **trivy-fs-config** → filesystem | ✅ Step completed | **None** | **None** |
| **trivy-fs-config** → config | ✅ Job green (`continue-on-error`) | **2 HIGH** misconfigurations | N/A |
| **trivy-docker-images** → `svcplat-api:latest` | ✅ Step completed | **None** (Debian 13 + Python packages) | Not scanned |
| **trivy-docker-images** → `svcplat-web:latest` | ✅ Step completed | **None** (Alpine 3.23 nginx) | Not scanned |

Overall workflow: **green** (non-blocking jobs absorb config-step exit if present).

### G.B. Findings table

| Area | Severity | Package / resource | Finding summary | Fixed version | Runtime relevance | Decision |
|------|----------|-------------------|-----------------|---------------|-------------------|----------|
| fs | — | — | No HIGH/CRITICAL vulnerabilities in scanned lockfiles/requirements (with CI skip-dirs) | — | N/A | **Clean** |
| config | HIGH | `api/Dockerfile` | DS-0002: no non-root `USER` directive | Best-practice check | Medium — container runs as root; mitigated by non-privileged app, no host mounts in prod compose | **Accepted temporarily** — add `USER` in future infra slice |
| config | HIGH | `web/Dockerfile` | DS-0002: no non-root `USER` directive (nginx stage) | Best-practice check | Medium — static nginx; prod serves read-only `dist/` | **Accepted temporarily** — add `USER` in future infra slice |
| api image | — | Debian 13.5 OS + Python deps | No HIGH/CRITICAL CVEs with `ignore-unfixed` | — | Runtime base image | **Clean** |
| web image | — | Alpine 3.23.5 (nginx) | No HIGH/CRITICAL CVEs with `ignore-unfixed` | — | Production frontend image | **Clean** |

**Secrets:** No secret findings in the reviewed filesystem scan.

**CVE summary:** No HIGH/CRITICAL **vulnerability** findings in fs or production images. Config scan reported **Dockerfile hardening** only (not dependency CVEs).

If only CVEs are considered: **No HIGH/CRITICAL CVE findings were observed in the reviewed run.**

### G.C. Blocking readiness decision

**Option 2 (partial)** — keep **non-blocking** for now:

- **Dependency/CVE layer:** Clean (`npm audit`, `pip-audit`, Trivy fs, Trivy images align).
- **Config layer:** Two HIGH **DS-0002** Dockerfile findings remain — document, do not ignore silently.
- **Promotion plan:** After a future slice adds non-root `USER` to `api/Dockerfile` and `web/Dockerfile` (or formal acceptance recorded in §C), re-run Trivy and consider removing `continue-on-error` in a follow-up slice.
- **Optional:** Confirm with one more scheduled Sunday run before blocking promotion.

**Do not** make Trivy blocking in Slice 10.

### G.D. Notes

- Trivy does **not** replace CodeQL, dependency-scan, OWASP ZAP, or manual auth/tenant checks.
- Base-image CVEs may reappear on rebuild when Trivy DB updates — re-triage on schedule.
- SARIF upload to GitHub Security tab remains optional future work.
- OWASP ZAP / Nuclei / legal pages — not in scope.

---

## H. Phase 6 Slice 11 — Docker non-root hardening (DS-0002)

**Completed:** Infrastructure hardening only — no app product logic or dependency changes.

### H.A. Changes

| Component | Change |
|-----------|--------|
| `api/Dockerfile` | `appuser` (uid 1000) / `appgroup`; `chown /app`; `USER appuser` |
| `web/Dockerfile` | nginx temp dirs under `/tmp/nginx`; pid path in main config; `USER nginx`; `EXPOSE 8080` |
| `web/nginx.conf` | `listen 8080`; writable temp paths under `/tmp/nginx` |
| `docker-compose.yml` | `5173:8080` (host 5173 unchanged) |
| `docker-compose.prod.yml` | `${WEB_HTTP_PORT:-80}:8080` |

### H.B. Trivy config after Slice 11

Local `trivy config --severity HIGH,CRITICAL` on Dockerfiles: **0 failures** (DS-0002 resolved for api and web).

### H.C. Blocking readiness (superseded by §I)

- DS-0002 **resolved** in repo; Slice 12 promoted Trivy to blocking after clean baseline verification.

### H.D. Notes

- Dev `api` still bind-mounts `./api:/app`; `appuser` uid 1000 matches typical host mapping on Docker Desktop.
- External reverse proxy still maps to host port 80/443 → container **8080** internally.

---

## I. Phase 6 Slice 12 — Trivy promoted to blocking

**Completed:** CI/security hardening only — no app product logic, dependency version, or auth/Stripe changes.

### I.A. Pre-promotion verification

| Job / scan | Result | HIGH/CRITICAL | Secrets | DS-0002 |
|------------|--------|---------------|---------|---------|
| **trivy-fs-config** → filesystem | ✅ Clean | None | None | N/A |
| **trivy-fs-config** → config | ✅ Clean | None | N/A | **Not present** |
| **trivy-docker-images** → `svcplat-api:latest` | ✅ Clean | None | N/A | N/A |
| **trivy-docker-images** → `svcplat-web:latest` | ✅ Clean | None | N/A | N/A |

Verified locally with Trivy 0.36.0 (same severity/skip-dirs as CI). Post–Slice 11 config scan: **0 failures**. CVE/fs/image baselines remain clean from Slice 10.

### I.B. Workflow change

- Removed `continue-on-error: true` from `trivy-fs-config` and `trivy-docker-images` in `.github/workflows/trivy.yml`.
- Kept: `workflow_dispatch`, weekly schedule, table output, no SARIF upload, no secrets, same scan settings and prod image build.

Future **HIGH/CRITICAL** Trivy findings (vulnerabilities, config misconfigurations, or secret patterns) will **fail** the workflow.

### I.C. Relationship to other scanners

| Tool | Status |
|------|--------|
| **CodeQL** | Separate workflow; unchanged |
| **dependency-scan** | Separate workflow; blocking (npm + pip) |
| **Trivy** | Separate workflow; **now blocking** |
| **Gitleaks** | Separate workflow; **blocking** (Slice 13) — git secrets; see [SECRETS_SCAN_REPORT.md](./SECRETS_SCAN_REPORT.md) |
| **OWASP ZAP** | Slice 14 readiness — [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md); **not in CI**; owned local/staging baseline only |
| **Nuclei** | Not planned in current slices |
| **Legal pages** | Future work |

Gitleaks (git-tracked secrets) is complementary to Trivy’s optional secret patterns in fs/images — not a substitute.

---

**Last updated:** Phase 6 Slice 14 — OWASP ZAP readiness docs added; Trivy/Gitleaks unchanged.
