# Secrets Scan Report — Phase 6 (Slice 13)

**Purpose:** Document Gitleaks scanning for accidental secrets in **our** repository (git history and tracked files).  
**Not in scope:** Runtime secret rotation, VPS hardening, OWASP ZAP, Nuclei, or third-party scanning.

Related: [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [TRIVY_SECURITY_REPORT.md](./TRIVY_SECURITY_REPORT.md) · [.github/workflows/gitleaks.yml](./.github/workflows/gitleaks.yml) · [.gitleaks.toml](./.gitleaks.toml)

---

## A. Current status

| Item | Status |
|------|--------|
| **Workflow** | ✅ `.github/workflows/gitleaks.yml` |
| **Triggers** | `push` / `pull_request` to `main`, `workflow_dispatch`, weekly Sunday 04:00 UTC |
| **Blocking** | **Yes** — fails workflow on detected leaks (no `continue-on-error`) |
| **License** | `GITLEAKS_LICENSE` **not** required for personal repos; organization repos may need it |
| **Permissions** | `contents: read`, `pull-requests: write` (PR comments only; no SARIF upload) |
| **Config** | `.gitleaks.toml` — cache/build path allowlist; narrow regex allowlist for **historical** doc/test false positives only |
| **Live secrets in git** | **None** — `.env` files are gitignored and must stay local |

Run manually: GitHub → **Actions** → **Gitleaks** → **Run workflow**.

---

## B. What it checks

Gitleaks scans repository history (full clone) and current tree for patterns such as:

- API keys and generic high-entropy secrets
- Passwords and connection strings with credentials
- Private keys (RSA, SSH, etc.)
- Stripe keys (`sk_live_`, `sk_test_`, `whsec_`, etc.)
- Webhook secrets and bearer tokens in curl/docs
- JWT-like and cloud credential strings

**What it does not check:** secrets only on a deployed server, environment variables at runtime, or third-party repositories.

---

## C. What it does not replace

| Tool / practice | Role |
|-----------------|------|
| **Runtime secret management** | `.env` on server, secret manager, rotation |
| **`.gitignore` discipline** | Prevent `.env` / keys from being staged |
| **CodeQL** | Custom source-code security patterns |
| **dependency-scan** | npm audit + pip-audit |
| **Trivy** | CVE/config/image baseline (includes some secret patterns in images) |
| **OWASP ZAP** | Planned later — staging URL only |
| **Manual review** | Architecture, access control, production env validation |

---

## D. If a secret is found

1. **Do not** only delete the latest commit — assume the secret is compromised.
2. **Rotate/revoke** the credential immediately (Stripe dashboard, JWT secret, DB password, SMTP, etc.).
3. **Remove from git history** if a real secret was committed (`git filter-repo`, BFG, or GitHub guidance).
4. **Check logs/access** for misuse since exposure.
5. **Store only in environment variables** or a secrets manager — never commit.
6. **Docs/examples:** use safe placeholders (`CHANGE_ME`, `sk_test_REDACTED`, `whsec_REDACTED`, `Bearer TOKEN`).
7. **Re-run Gitleaks** locally and in CI until clean.

---

## E. Local commands

Install [Gitleaks](https://github.com/gitleaks/gitleaks) locally (optional).

From project root:

```bash
# Scan git history + working tree (redacted output)
gitleaks detect --source . --redact

# Use repo config (cache path allowlist)
gitleaks detect --source . --config .gitleaks.toml --redact
```

Docker (Linux/macOS):

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo --config /repo/.gitleaks.toml --redact
```

PowerShell (Windows):

```powershell
docker run --rm -v "${PWD}:/repo" zricethezav/gitleaks:latest detect --source /repo --config /repo/.gitleaks.toml --redact
```

**Do not** paste detected secret values into tickets — reference rule ID and file path only.

---

## F. Baseline decision (Slice 13)

**Pre-promotion triage (local Gitleaks 8.x):**

| Category | Finding | Resolution |
|----------|---------|------------|
| Docs | `curl-auth-header` on placeholder Bearer tokens in `README_BACKEND.md` | Removed `Authorization` headers from curl blocks; added auth note |
| Tests | `generic-api-key` on hex JWT fixtures | Replaced with `test-jwt-placeholder-thirty-two-characters-min` |
| Tests | Postgres password in `DATABASE_URL` fixtures | Replaced with `example-postgres-password-for-unit-tests-only` |
| Tests | Stripe-like strings in production env output test | Replaced with `*-redacted-for-test` placeholders |
| History | Old `CLIENT_TOKEN` / `SUPERADMIN_TOKEN` / hex JWT in git history | Narrow regex allowlist in `.gitleaks.toml` (documented; not `.env`) |
| Cache | `__pycache__` bytecode (local only) | Gitignored; excluded in `.gitleaks.toml` paths |

**Decision:** Baseline **clean** after placeholder fixes → workflow is **blocking**.

If new false positives appear, prefer safer placeholder wording before adding allowlist rules. Never allowlist `.env` or live secret patterns.

---

## G. Relationship to Trivy

| Scanner | Focus |
|---------|--------|
| **Gitleaks** | Git-tracked secrets in source/docs/history |
| **Trivy** | CVEs, Dockerfile misconfig, image OS packages; optional secret scan in images/fs |
| **CodeQL** | Application source security queries |

All three are separate workflows; a green Gitleaks run does not replace Trivy or dependency-scan.

---

**Last updated:** Phase 6 Slice 13 — Gitleaks baseline (blocking).
