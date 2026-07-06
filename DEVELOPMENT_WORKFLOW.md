# Development workflow

How we implement, verify, and merge changes in this repository — with minimal duplicate work between Cursor, local developers, and GitHub Actions.

## Verification layers

| Layer | Who | Role |
|-------|-----|------|
| **1. Implementation** | Cursor (or any AI assistant) | Write code and summarize the slice. **Does not run** tests, builds, typecheck, Docker, pytest, or e2e. |
| **2. Local verification** | Developer | Run **targeted** checks for the area you changed. Full suites only at checkpoints or high-risk changes. |
| **3. CI gate** | GitHub Actions | Final automated gate on `main` — blocking jobs must pass before merge. |

### Cursor policy

> **Cursor implementation prompts should not ask Cursor to run tests/build/check commands.** The prompt may list recommended verification commands for the user separately, but Cursor should not execute them.

Cursor should end each slice with a short summary (what changed, what to verify manually, any follow-ups). The developer chooses when and how much to run locally.

## Local verification (developer)

Use **targeted** checks during small slices. Reserve **full** checks for backend checkpoints, release prep, or changes that touch auth, billing, migrations, Docker, or cross-cutting infrastructure.

### Frontend-only slice (`web/**`)

From `web/`:

```bash
npm run test -- <related-test-file-or-pattern>
npm run typecheck
```

Optional before merge / larger UI work:

```bash
npm run build
npm run check:routes
```

### Backend-only slice (`api/**`, `scripts/**`)

With Docker API running:

```bash
docker compose exec api python -m pytest api/tests/path/to/test_module.py -q
docker compose exec api python scripts/check_backend.py
```

Target a single test file or directory instead of the full suite when iterating.

### Docs-only slice (`*.md`, plans, runbooks)

No local test/build required. GitHub Actions skips heavy `ci.yml` jobs when only documentation changes (see below). Gitleaks still runs on every push/PR.

### Full checkpoint (before merge or release)

**Backend** (from project root, Docker up):

```bash
docker compose up -d --build postgres api
docker compose exec api alembic upgrade head
docker compose exec api python -m pytest
docker compose exec api python scripts/check_backend.py
docker compose exec api python scripts/seed_demo.py
```

**Frontend** (from `web/`):

```bash
npm ci
npm run test
npm run typecheck
npm run build
npm run check:routes
```

**E2E** (manual, not in blocking CI): see [README_FRONTEND.md](./README_FRONTEND.md) — Playwright requires seeded backend.

**Important:** Run `seed_demo.py` **after** `pytest` if you need demo users for manual UI or E2E — tests truncate auth-related tables.

Command reference: [README_BACKEND.md](./README_BACKEND.md) · [README_FRONTEND.md](./README_FRONTEND.md)

## GitHub Actions (final gate)

Workflows live in [`.github/workflows/`](./.github/workflows/).

| Workflow | Triggers | Blocking? | Notes |
|----------|----------|-----------|-------|
| **CI** (`ci.yml`) | push/PR → `main` | Yes | Path-filtered backend/frontend jobs; concurrency cancels stale runs |
| **CodeQL** (`codeql.yml`) | push/PR → `main`, weekly | Yes (alerts) | Skipped for docs-only diffs |
| **Gitleaks** (`gitleaks.yml`) | push/PR → `main`, weekly | Yes | Always runs — fast secrets scan |
| **Dependency scan** (`dependency-scan.yml`) | weekly, manual | Yes (that workflow) | npm audit + pip-audit |
| **Trivy** (`trivy.yml`) | weekly, manual | Yes (that workflow) | FS/config + prod image scan |
| **OWASP ZAP** (`zap-baseline.yml`) | manual only | No (`continue-on-error`) | Local Docker stack only |

Security scans are **not** removed or weakened on `main`. Weekly/manual scans (dependency, Trivy) stay separate from per-PR CI to avoid triplicate heavy work.

### CI path filtering (`ci.yml`)

- **backend-tests** runs when `api/**`, `scripts/**`, Docker/env templates, or API Dockerfiles change.
- **frontend-tests** runs when `web/**` or shared compose files change.
- **Docs-only** and **workflow-only** changes (e.g. `.github/workflows/ci.yml` alone) skip both heavy jobs; `detect-changes` still runs.
- **Concurrency:** new pushes cancel in-progress runs for the same PR/branch.

### What CI does not duplicate locally

- Playwright browser E2E is intentionally **local/manual** (see `ci.yml` TODO).
- Dependency/Trivy full scans run on schedule, not every PR push.

## Prompt template (for slice work)

When asking Cursor to implement a slice:

1. State the goal and files in scope.
2. Explicitly: **Do not run** tests, builds, typecheck, Docker, pytest, or e2e.
3. List **recommended manual verification** for the user (targeted commands).
4. Note that GitHub Actions is the merge gate.

Example closing line for prompts:

> Implement only. Do not run verification commands. I will run manual checks; CI is the final gate.

## Future CI improvements (optional)

These are documented for later slices — only adopt when low-risk:

- Add `paths-ignore` to more workflows if new docs-only automation is added.
- Optional `workflow_dispatch` inputs on CI to force full backend/frontend on demand.
- Branch protection: require `backend-tests` / `frontend-tests` only when those jobs run (GitHub “skipped” jobs and required checks — verify org settings before changing).
