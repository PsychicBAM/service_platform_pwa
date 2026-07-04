# Production Launch Control Center

**Main index before VPS deploy and public launch.** Use this document to find the right checklist or runbook, understand current readiness, and make an honest go/no-go decision.

**This document does not:** replace legal or business review; contain secrets; guarantee compliance; or automate deployment.

**Status legend:**

| Label | Meaning |
|-------|---------|
| **GREEN** | Implemented and tested in repo/CI |
| **YELLOW** | Operator-controlled or requires real VPS configuration |
| **RED** | Blocker before public launch |
| **BLUE** | Documentation or design only — not production implementation |

---

## A. Purpose

The Service Platform has many readiness reports and operator runbooks spread across the repository. This control center:

- Links to the **correct** document for each launch task
- Summarizes **honest** readiness status (GREEN / YELLOW / RED / BLUE)
- Separates **what is built** from **what operators must configure** on a VPS
- Records **final public launch blockers** that remain even when CI is green

No passwords, API keys, domains, or `.env` values belong in this file or in git.

---

## B. Current readiness status

### GREEN — implemented and tested

| Area | Evidence |
|------|----------|
| CI / GitHub Actions | Backend + frontend workflows green |
| CodeQL | `.github/workflows/codeql.yml` |
| dependency-scan | Blocking workflow |
| Trivy | Blocking image/filesystem scan |
| Gitleaks | Blocking secrets scan |
| OWASP ZAP baseline | Triaged; [ZAP_SECURITY_REPORT.md](./ZAP_SECURITY_REPORT.md) |
| Backend tests | `pytest` (~681 tests) |
| Frontend tests | Vitest (~115 tests) |
| Playwright e2e | ~30 tests |
| Consent enforcement | Registration, public booking, public order APIs |
| Consent audit records | `legal_consent_records` table + writes |
| Consent UI | Business admin + superadmin read-only pages |
| Email dry-run readiness | `check_email_readiness.py`; defaults safe |
| Manual superadmin plan updates | Persist after reload (tested) |
| Backup/restore helpers | Documented + script smoke tests |
| VPS / SMTP / Stripe runbooks | Phase 8 operator docs exist |
| Production env strict validation | `check_production_env.py --strict` |

### YELLOW — operator-controlled or needs real VPS

| Area | Notes |
|------|-------|
| VPS deployment | Not performed on real server yet |
| Domain / DNS / HTTPS | Placeholders only in repo |
| SMTP live mode | `EMAIL_ENABLED=false`, `EMAIL_DRY_RUN=true` by default |
| Stripe test mode on VPS | `STRIPE_ENABLED=false` by default; test rollout via runbook |
| Backup schedule / off-server copy | Documented; not verified on live VPS |
| Monitoring | Checklist-based; no external service integrated |
| OWASP ZAP on staging URL | Re-run after HTTPS deploy recommended |

### RED — blocker before public launch

| Blocker | Detail |
|---------|--------|
| Lawyer-reviewed legal text | Privacy / Terms / Consent / Cookies are **placeholders** — [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) |
| Legal compliance claim | Do **not** claim GDPR/legal compliance publicly yet |
| Live Stripe without test verification | Requires [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) + business decision |
| Live email without SMTP checks | Requires [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) |
| Deletion/export as product feature | Design only — no user-facing export/deletion API |

### BLUE — docs / design only

| Item | Document |
|------|----------|
| Data retention / deletion / export | [DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md) |
| Business/client export API | Future work |
| Deletion / anonymization workflow | Future work |
| Automated VPS provisioning | Not in repo — operator manual steps |
| Consent storage/access **design** (early slices) | [CONSENT_AUDIT_STORAGE_PLAN.md](./CONSENT_AUDIT_STORAGE_PLAN.md), [CONSENT_RECORDS_ACCESS_PLAN.md](./CONSENT_RECORDS_ACCESS_PLAN.md) — superseded by implementation where noted in those docs |

---

## C. Main runbook order

Recommended reading and execution order for operators:

| # | Document | When |
|---|----------|------|
| 1 | **PRODUCTION_LAUNCH_CONTROL_CENTER.md** (this file) | Start here |
| 2 | [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Master checklist |
| 3 | [VPS_DRY_RUN_DEPLOYMENT_CHECKLIST.md](./VPS_DRY_RUN_DEPLOYMENT_CHECKLIST.md) | Staging dry-run deploy |
| 4 | [VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md](./VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md) | DNS, TLS, CORS |
| 5 | [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) | Detailed deploy steps |
| 6 | [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) | Only if enabling email |
| 7 | [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) | Only if enabling Stripe **test** mode |
| 8 | [BACKUP_READINESS_REPORT.md](./BACKUP_READINESS_REPORT.md) · [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) · [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) | Backups |
| 9 | [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) | Logs, health, alerts plan |
| 10 | [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) | Legal blockers |
| 11 | [DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md) | Future data lifecycle |

**Supporting references:** [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) · [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · [MVP_RELEASE_REPORT.md](./MVP_RELEASE_REPORT.md) · [README_BACKEND.md](./README_BACKEND.md) · [README_FRONTEND.md](./README_FRONTEND.md) · [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) (local Stripe CLI)

---

## D. Go / no-go checklist

### Go only if

- [ ] CI green (backend + frontend)
- [ ] CodeQL green (or alerts triaged)
- [ ] dependency-scan green
- [ ] Trivy green
- [ ] Gitleaks green
- [ ] OWASP ZAP baseline reviewed (re-scan staging HTTPS when available)
- [ ] `check_production_env.py --strict` passes on **VPS** `.env`
- [ ] DB migration succeeds (`alembic upgrade head`)
- [ ] Health checks pass over HTTPS
- [ ] Backup dry-run created on VPS
- [ ] HTTPS works; CORS matches public origin
- [ ] Public booking/order/register flows work
- [ ] No secrets in application logs
- [ ] Stripe mode intentional (`STRIPE_ENABLED=false` or test-mode per runbook)
- [ ] Email mode intentional (`EMAIL_DISABLED` / dry-run / live per SMTP runbook)
- [ ] Legal placeholder status **understood** — not presented as final counsel-approved text

### No-go if

- [ ] Secrets leaked or committed
- [ ] Gitleaks fails
- [ ] Production env strict check fails on server
- [ ] DB migration fails
- [ ] HTTPS or CORS broken
- [ ] Backup cannot be created
- [ ] Legal pages presented as final when they are placeholders
- [ ] Live Stripe or live email enabled accidentally
- [ ] Demo seed or demo credentials on public production

**Public launch remains a manual business decision** even when all technical gates pass.

---

## E. Feature readiness map

| Feature | Status | Evidence | Remaining work |
|---------|--------|----------|----------------|
| Auth / register | GREEN | API + UI; consent on register | OAuth not implemented |
| Public booking | GREEN | API + UI + e2e | Live VPS smoke |
| Public order / request | GREEN | API + UI + e2e | Live VPS smoke |
| Admin dashboard | GREEN | Routes + guards + tests | — |
| Superadmin dashboard | GREEN | Routes + guards + tests | — |
| Billing / manual plans | GREEN | Superadmin PATCH persists | Live billing policy |
| Stripe checkout / webhook prep | GREEN | API + UI + mocked tests | VPS test mode (YELLOW) |
| Email readiness | GREEN | Dry-run audits; safe defaults | VPS SMTP (YELLOW) |
| Legal consent checkbox | GREEN | Register, booking, order UI | Lawyer text (RED) |
| Legal consent enforcement | GREEN | Backend API validation | — |
| Consent audit records | GREEN | DB + writes | Export/deletion (BLUE) |
| Consent record UI | GREEN | Admin + superadmin read-only | — |
| Backup / restore | GREEN | Docs + helper scripts + tests | VPS schedule (YELLOW) |
| Monitoring | YELLOW | [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md) | External alerts optional |
| VPS deployment | YELLOW | Runbooks exist | Real deploy not done |
| HTTPS / reverse proxy | YELLOW | Runbook + nginx headers | Real cert/DNS |
| Data export | BLUE | [DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md) | No export API |
| Data deletion / retention | BLUE | Design plan only | No deletion API |
| Live Stripe payments | RED | Disabled by default | Test mode + legal decision |
| Live transactional email | RED | Disabled/dry-run by default | SMTP runbook + legal decision |
| Final legal documents | RED | Placeholder pages | Lawyer review |

---

## F. Critical safety rules

| Rule | Detail |
|------|--------|
| Never commit `.env` or `.env.production` | Secrets on VPS only |
| Never paste secrets into chat, issues, or logs | Rotate if exposed |
| Never print `password_hash`, JWTs, SMTP passwords, Stripe keys | Use static audit codes |
| Keep `EMAIL_DRY_RUN=true` until intentional live email test | [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) |
| Keep `STRIPE_ENABLED=false` until intentional test-mode rollout | [STRIPE_TEST_MODE_RUNBOOK.md](./STRIPE_TEST_MODE_RUNBOOK.md) |
| No live Stripe keys during test rollout | `sk_test_…` only until separate live decision |
| No real card data in tests | Stripe test cards only |
| No final legal compliance claim | Placeholder legal text is not counsel-approved |
| Do not run `seed_demo.py` on public production | `APP_ENV=production` gate |

---

## G. Final public launch blockers

These remain **after** CI and local tests are green:

1. **Lawyer-reviewed** Privacy Policy, Terms, Consent, Cookies (replace placeholders)
2. **Real VPS dry-run** completed — [VPS_DRY_RUN_DEPLOYMENT_CHECKLIST.md](./VPS_DRY_RUN_DEPLOYMENT_CHECKLIST.md)
3. **DNS + HTTPS** configured — [VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md](./VPS_REVERSE_PROXY_HTTPS_RUNBOOK.md)
4. **Backup schedule** and off-server copy verified on VPS
5. **SMTP decision** — disabled, dry-run, or live per [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md)
6. **Stripe decision** — disabled, test mode, or live per business/legal review
7. **Monitoring plan** accepted — [MONITORING_READINESS_REPORT.md](./MONITORING_READINESS_REPORT.md)
8. **Support / contact process** defined for operators and users
9. **Data retention / deletion / export policy** accepted at business level — [DATA_RETENTION_DELETION_EXPORT_PLAN.md](./DATA_RETENTION_DELETION_EXPORT_PLAN.md) (implementation still future)

---

## H. Maintenance notes

- Update this file after each **production readiness slice** — keep statuses honest
- Do **not** mark BLUE (design-only) items as GREEN (implemented)
- Do **not** mark YELLOW items as done until verified on a real VPS
- When a blocker clears (e.g. legal review complete), move it from RED to GREEN/YELLOW with date in commit message
- Link new runbooks here when added — avoid orphan docs

---

**Last updated:** Phase 8 Slice 6 — production launch control center (docs only; no code changes).
