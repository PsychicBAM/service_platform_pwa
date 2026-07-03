# Data Retention, Deletion & Export Plan — Phase 7 (Slice 20)

**Purpose:** Design safe data retention, deletion, and export strategy before any implementation.  
**Status:** Design only (Slice 20) — **no API, UI, migration, or deletion/export workflows** in this slice.  
**Disclaimer:** This document is **not legal advice** and does **not** claim legal compliance. Retention periods, erasure procedures, and data-subject rights require qualified legal review for your jurisdiction(s).

Related: [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) · [CONSENT_AUDIT_STORAGE_PLAN.md](./CONSENT_AUDIT_STORAGE_PLAN.md) · [CONSENT_RECORDS_ACCESS_PLAN.md](./CONSENT_RECORDS_ACCESS_PLAN.md) · [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) · [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md)

---

## A. Current status

| Item | Status |
|------|--------|
| **User / business / client / booking / order data** | ✅ Stored in PostgreSQL |
| **`legal_consent_records` table** | ✅ Writes on registration, public booking, public order (Slice 15) |
| **Consent read APIs** | ✅ Superadmin + business admin (Slices 17–18) |
| **Consent read UI** | ✅ `/superadmin/legal-consents`, `/admin/legal-consents` (Slices 19A–19B) |
| **Retention policy (legal/ops)** | ❌ Not defined — TBD after legal review |
| **Account / business deletion flow** | ❌ Not implemented |
| **Client data erasure (business-initiated)** | ❌ Not implemented |
| **Data export / portability API** | ❌ Not implemented |
| **Data-subject request workflow** | ❌ Not implemented |
| **Backup schedule templates** | ⏳ [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) — not live on VPS |
| **Lawyer-reviewed legal text** | ❌ Not done |

**Launch rule:** Do not claim compliance. Do not implement destructive deletion or bulk export until counsel approves scope, retention periods, and user-facing procedures.

---

## B. Data categories

Major categories the platform stores or may store. **No real examples or personal data below.**

| Category | Examples (abstract) | Notes |
|----------|---------------------|--------|
| **User accounts** | Email, name, password hash, role | Auth + admin/client access |
| **Business profiles / settings** | Name, slug, timezone, JSON settings | Includes interim consent metadata in `business.settings` |
| **Services / categories** | Service name, price, type, schedule metadata | Business-scoped product data |
| **Clients** | Name, email, phone, source | Guest or registered; business-scoped |
| **Bookings** | Service, time slot, status, client link | May include client contact details |
| **Public orders / requests** | Status, reference, `form_data` text | Request details from guest/client |
| **Order messages** | Message body, sender type | Client ↔ business thread |
| **Legal consent records** | Source, entity, version, timestamps, optional ID refs | Audit summary — no legal text, no IP/UA today |
| **Billing / plan metadata** | Plan, subscription status, usage counts | No raw card data — Stripe handles PAN when enabled |
| **Stripe IDs / status** | Customer ID, session IDs (when enabled) | Future live billing only |
| **Email / notification logs** | ⏳ Future if outbound email logging added | Not a dedicated audit table in MVP |
| **Audit / admin logs** | `audit_logs` — action, target, metadata | Operational audit; separate from consent records |
| **Backups** | PostgreSQL dumps outside repo | May retain deleted rows until rotation |
| **Application logs** | Server/Docker/reverse-proxy logs | May contain IPs if proxy logs them — policy TBD |

---

## C. Retention principles

General design principles — **not legally binding periods**.

1. **Keep only what is needed** — minimize collection; document purposes in Privacy Policy after legal review.
2. **Prefer summary over raw payload** — consent audit uses summary fields; avoid expanding storage of full request bodies for audit.
3. **No secrets in logs or exports** — password hashes, tokens, webhook secrets, SMTP credentials never in export files or application logs.
4. **Consent records may outlive UI entities** — audit rows may need longer retention than booking/order display data; **exact period TBD after legal review**.
5. **Retention periods are placeholders until counsel signs off** — use “TBD after legal review” / “define before public launch” in checklists.
6. **Backups extend effective retention** — deleted live data may remain in backups until backup rotation expires ([BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) §C).
7. **Tenant isolation on any future export/delete** — business A must never export or delete business B data.
8. **Destructive actions are explicit and auditable** — no silent hard deletes in MVP paths.

---

## D. Deletion scenarios

Design scenarios only — **no implementation in Slice 20**.

### 1. Client asks business to delete their data

| Aspect | Design |
|--------|--------|
| **Actor** | Business owner/admin (future) |
| **Scope** | Client profile + related contact fields where policy allows |
| **Bookings / orders** | May require business/legal decision — operational records vs erasure request |
| **Consent records** | See §E — likely retain summary row; null/anonymize `client_id` if counsel requires |
| **UI** | Future business admin action or documented manual process until automated |

### 2. Business owner deletes business account

| Aspect | Design |
|--------|--------|
| **Actor** | Business owner (future) or superadmin with confirmation |
| **Flow** | Suspend/disable first → retention check → hard delete or anonymize after confirmation |
| **Related data** | Services, clients, bookings, orders, members, consent rows — policy per category |
| **Stripe** | Cancel subscription via Stripe when live billing enabled; do not delete Stripe objects casually |
| **Backups** | Deleted data may persist in backups until rotation |

### 3. Platform user deletes account

| Aspect | Design |
|--------|--------|
| **Actor** | Registered client or business user (future self-service) |
| **Scope** | Remove or anonymize account fields (email, name, password hash) |
| **Preserve** | Minimal audit/legal records only if policy allows/requires (TBD) |
| **Memberships** | Revoke business memberships; do not orphan billing without review |

### 4. Superadmin deletes business or user

| Aspect | Design |
|--------|--------|
| **Risk** | High — platform-wide impact |
| **Requirements** | Superadmin auth, explicit confirmation, audit log entry, no casual one-click delete |
| **Prefer** | Suspend → export snapshot (if policy allows) → scheduled purge after retention window |

---

## E. Consent records handling

**Preferred policy design** (subject to lawyer review — **not claimed as legally correct**).

| Rule | Rationale |
|------|-----------|
| **Do not casually delete with normal UI records** | `legal_consent_records` are audit evidence |
| **When related entity is deleted** | Row may remain with: `source`, `entity_type`, `entity_id`, `legal_consent_version`, `accepted_at`, `created_at`, `business_id` (if policy allows) |
| **Personal references** | `user_id` / `client_id` may be **nulled or anonymized** on erasure if counsel requires minimization after retention period |
| **No IP/user-agent today** | Do not retroactively add without Privacy Policy disclosure |
| **Retention period** | **TBD after legal review** — may differ from booking/order display retention |
| **Export** | Include **summary fields only** in business/client export packages — same shape as read APIs |

Final handling of consent rows on account/business erasure **depends on lawyer review** and jurisdiction (e.g. GDPR, 152-FZ).

---

## F. Export / data request design

Future export scope — **no endpoints in Slice 20**.

### Business owner export (future)

| Include | Exclude |
|---------|---------|
| Business profile / settings (non-secret) | Password hashes, tokens, secrets |
| Services list | Raw internal logs |
| Bookings / orders (business-scoped) | Other businesses’ data |
| Clients (business-scoped) | Full Stripe secret keys |
| Consent record **summaries** for that business | IP/user-agent (not collected) |

### Client / user export (future)

| Include | Exclude |
|---------|---------|
| Account profile fields | Other users’ data |
| Their bookings / orders if identifiable | password_hash, reset tokens |
| Consent summaries tied to them **if policy allows** | Hidden admin metadata |

### Superadmin export (future)

| Rule | Notes |
|------|-------|
| Restricted | Only after policy + role controls |
| No unrestricted MVP export | Platform-wide bulk export is high risk |
| Audited | Log export action in `audit_logs` |

### Format (future)

- **JSON or CSV** — TBD in implementation slice
- Paginated generation for large datasets
- No secrets, tokens, `password_hash`, or raw application logs

---

## G. Backup retention design

| Topic | Design |
|-------|--------|
| **Purpose** | Disaster recovery — backups are necessary |
| **Deleted live data** | May remain in dumps until backup rotation expires |
| **Retention duration** | Draft tiers in [BACKUP_SCHEDULE_REPORT.md](./BACKUP_SCHEDULE_REPORT.md) §C — **finalize with legal/ops before launch** |
| **Encryption / off-server copy** | Future VPS work — not in MVP slice |
| **Restore drill** | [RESTORE_DRILL_REPORT.md](./RESTORE_DRILL_REPORT.md) — required before launch |
| **Erasure vs backups** | Privacy Policy should disclose that backups may retain data for a limited period after deletion request |

---

## H. Implementation roadmap

Flexible future slices — **not committed scope**.

| Slice | Focus |
|-------|--------|
| **21** | Retention policy placeholders in docs/checklists; lawyer-reviewed period table |
| **22** | Business owner **read-only export API** (no UI first); JSON/CSV; tenant-scoped |
| **23** | Account / business **deletion design** — soft-delete vs hard-delete; confirmation flows |
| **24** | Soft-delete / anonymization for clients/users if approved by legal review |
| **25** | Admin UI for export and deletion requests after legal review |
| **26+** | Data-subject request intake, superadmin export, backup erasure coordination |

Dependencies: lawyer-reviewed Privacy Policy, Terms, retention table, and launch checklist sign-off.

---

## I. Security requirements

All future deletion/export features must satisfy:

| Requirement | Notes |
|-------------|-------|
| **Authentication** | Every endpoint requires valid JWT |
| **Authorization** | Business admin → own business only; superadmin → explicit role |
| **Tenant isolation** | Business A cannot export/delete business B data — test matrix required |
| **No secrets in export** | Strip password_hash, tokens, webhook secrets, SMTP credentials |
| **Audit destructive actions** | Delete business/user/client → `audit_logs` entry |
| **Audit export actions** | Large exports logged (who, when, scope — not file contents) |
| **Confirmation for destructive ops** | Typed confirm or multi-step — no accidental purge |
| **Rate limits** | Consider on export endpoints when implemented |
| **Fail closed** | Export/delete errors return static codes; no partial secret leakage |

---

## J. Legal caveats

- **Not legal compliance** — this plan does not satisfy GDPR, 152-FZ, CCPA, or other regimes by itself.
- **Lawyer review required** — retention periods, erasure scope, consent record handling, and backup disclosure must be approved by counsel.
- **Final legal text required** — Terms, Privacy Policy, and consent wording remain placeholders until review.
- **Data-subject procedures** — access, rectification, erasure, portability, and objection flows must be finalized **before public launch** if required in target markets.
- **No IP/user-agent** — not collected on consent records today; collection requires legal review and policy update.
- **Do not promise immediate erasure from backups** — disclose backup retention honestly after legal review.

---

**Slice 20:** Data retention, deletion, and export **design only** — no implementation.

**Last updated:** Phase 7 Slice 20 — retention/deletion/export plan (not legal advice).
