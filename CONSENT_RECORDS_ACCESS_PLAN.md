# Consent Records Read/Admin Access Plan — Phase 7 (Slice 16)

**Purpose:** Design safe read and admin access for `legal_consent_records` before any API or UI implementation.  
**Status:** Superadmin and business admin read-only APIs implemented (Slices 17–18). UI (Slice 19) remains future work. **Not legal compliance.**  
**Disclaimer:** This document is **not legal advice** and does **not** claim legal compliance. Access rules, retention, export, and deletion require qualified legal review.

Related: [CONSENT_AUDIT_STORAGE_PLAN.md](./CONSENT_AUDIT_STORAGE_PLAN.md) · [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) · [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md)

---

## A. Current status

| Item | Status |
|------|--------|
| **`legal_consent_records` table** | ✅ Exists (Slice 15, migration `0010`) |
| **Writes on registration** | ✅ `source=registration`, `entity_type=business` |
| **Writes on public booking** | ✅ `source=public_booking`, `entity_type=booking` |
| **Writes on public order** | ✅ `source=public_order`, `entity_type=order` |
| **Read API** | ✅ Superadmin `GET /api/v1/superadmin/legal-consents` (Slice 17) |
| **Business admin read API** | ✅ Slice 18 — `GET /api/v1/businesses/{business_id}/legal-consents` |
| **Admin / superadmin UI** | ❌ Slice 19 |
| **IP / user-agent** | ❌ Not collected |
| **Lawyer-reviewed legal text** | ❌ Not done |

Records are an **append-only audit trail**. Keeping them **write-only** until access rules, tenant isolation, and data-minimization boundaries are designed is intentional — it reduces risk of accidental exposure of audit metadata or cross-tenant data leaks.

**Launch rule:** Do not claim compliance. Do not expose consent records publicly. Lawyer review and retention/deletion policy are still required before public launch.

---

## B. Access roles

### Superadmin

| Capability | Allowed | Notes |
|------------|---------|-------|
| View platform-wide consent record **summaries** | ✅ Slice 17 | `GET /api/v1/superadmin/legal-consents` |
| Filter by business, source, entity type | ✅ Planned | `business_id`, `source`, `entity_type` |
| View raw request payloads | ❌ Never | Not stored in consent table; must not join to expose `form_data` |
| View passwords, tokens, secrets | ❌ Never | Out of scope |
| Export bulk CSV/JSON | ❌ Deferred | Until retention/export policy is defined (Slice 20+) |

Superadmin access supports **platform operations and audit support**, not full personal-data review. Responses should expose only fields listed in §C (data minimization).

### Business owner / admin

| Capability | Allowed | Notes |
|------------|---------|-------|
| View consent records for **their business only** | ✅ Slice 18 | Mandatory `business_id` scope + membership check |
| View platform-wide records | ❌ Never | Superadmin only |
| View other businesses' records | ❌ Never | Tenant isolation required |
| View client PII beyond existing admin screens | ❌ No expansion | `client_id` as opaque reference only; no new name/email/phone from consent API |
| View booking/order `form_data` via consent endpoint | ❌ Never | Use existing booking/order admin APIs if authorized |

Business admins need enough context to confirm consent was recorded for a booking or order they already manage — not a new channel for personal data.

### Client / registered user

| Capability | Allowed | Notes |
|------------|---------|-------|
| Direct UI for consent records | ❌ First version | No client-facing consent history page in MVP |
| Future data export / access request | ⏳ Slice 20+ | May include consent rows after legal review defines scope |

### Public / anonymous

| Capability | Allowed |
|------------|---------|
| Any access to consent records | ❌ Never |

---

## C. Data minimization

### Recommended visible fields (read API / future UI)

| Field | Show | Notes |
|-------|------|-------|
| `id` | ✅ | Record identifier |
| `source` | ✅ | `registration` · `public_booking` · `public_order` |
| `entity_type` | ✅ | `business` · `booking` · `order` |
| `entity_id` | ✅ | Link to entity admin already may access |
| `legal_consent_version` | ✅ | e.g. `draft-placeholder-v1` |
| `accepted_at` | ✅ | When consent was accepted |
| `created_at` | ✅ | Row insert time |
| `business_id` | ✅ Superadmin; ✅ business admin (own) | Tenant key |
| `business_name` / `slug` | ✅ Superadmin only (optional denorm) | Avoid N+1; join only if authorized |
| `user_id` | ⚠️ Opaque UUID only | Registration context; no email/name expansion |
| `client_id` | ⚠️ Opaque UUID only | Only if caller already has client admin access |

### Do not show

| Data | Reason |
|------|--------|
| Password hashes | Never relevant |
| JWT, reset tokens, webhook secrets | Security risk |
| Raw HTTP request payloads | Not stored; do not join to expose |
| Order `form_data`, booking notes, message bodies | Personal data — separate authorized APIs |
| `business.settings` consent JSON blob | Redundant; table is authoritative |
| Full legal document text | Not stored in table |
| IP address / user-agent | Not collected yet; do not add in read layer |
| Stripe IDs, SMTP credentials | Unrelated |

**Response shape principle:** A dedicated **summary DTO** — not the raw SQLAlchemy model or internal write payload. No logging of consent list responses containing IDs that could be correlated to individuals in ops logs.

---

## D. API design options

### Option A — Superadmin-only endpoint first

**Draft route:** `GET /api/v1/superadmin/legal-consents`

| Pros | Cons |
|------|------|
| Single, well-understood auth gate (`superadmin` role) | Business owners cannot self-audit yet |
| Easier to ship and review | Ops burden on platform team for per-business questions |
| Lower cross-tenant leak risk in v1 | May delay owner-facing transparency |
| Matches existing superadmin audit patterns | |

### Option B — Business admin endpoint

**Draft route:** `GET /api/v1/businesses/{business_id}/legal-consents`

| Pros | Cons |
|------|------|
| Useful for business owner compliance questions | **Tenant isolation must be bulletproof** |
| Reduces superadmin support load | `{business_id}` in path is a common IDOR footgun |
| Aligns with other business-scoped admin APIs | Requires membership/role checks on every query |

### Option C — Both, staged (recommended)

| Phase | Deliverable |
|-------|-------------|
| **Slice 17** | Superadmin read-only API + repository list methods + tests |
| **Slice 18** | Business admin read-only API + tenant isolation tests |
| **Slice 19** | Admin / superadmin UI tables (no sensitive columns) |
| **Slice 20+** | Export / data-subject request strategy after legal review |

### Decision

**Recommend Option C (staged):**

1. **Superadmin read-only API first** — smallest blast radius; validates pagination, filters, and DTO shape.
2. **Business admin API second** — only after explicit tenant-isolation test matrix (business A ≠ business B).
3. **UI last** — after APIs are stable and reviewed; tables show summary fields only.

**This slice adds no routes.** Implementation is deferred to Slices 17–19.

---

## E. Security / tenant isolation requirements

### Authentication & authorization

| Endpoint | Requirement |
|----------|-------------|
| Superadmin list | Valid JWT + `is_superadmin` (or equivalent existing guard) |
| Business list | Valid JWT + active membership with admin role for `{business_id}` |

Reuse existing dependency patterns from superadmin audit logs and business admin routes — do not invent a parallel auth mechanism.

### Query rules

1. **Superadmin:** May query all businesses; optional `business_id` filter; never bypass pagination.
2. **Business admin:** `WHERE business_id = :authorized_business_id` — **mandatory**, not optional filter from client input alone.
3. **No cross-business access:** Business A admin requesting business B path → `403` or `404` (match existing project convention).
4. **No public routes:** Consent records are never on unauthenticated or public API paths.

### Operational safety

| Requirement | Notes |
|-------------|-------|
| Pagination required | Before datasets grow; default limit 20–50 |
| Max limit cap | e.g. 100 — reject higher |
| No export in v1 | Bulk download deferred until retention policy exists |
| No response logging | Do not log consent list bodies in application logs |
| Static error codes | e.g. `FORBIDDEN`, `NOT_FOUND` — no internal details |

### Test matrix (required before business admin API ships)

| Test | Expected |
|------|----------|
| Superadmin lists all | `200`, records from multiple businesses when seeded |
| Superadmin filters by `business_id` | Only that business |
| Business admin lists own business | `200`, only own `business_id` |
| Business admin requests other `business_id` | `403` or `404` |
| Unauthenticated request | `401` |
| Regular client user (non-admin) | `403` |
| Response shape | Summary DTO only; no extra PII fields |

---

## F. Suggested filters / pagination

### Filters (v1)

| Parameter | Applies to | Notes |
|-----------|------------|-------|
| `source` | Both | `registration`, `public_booking`, `public_order` |
| `entity_type` | Both | `business`, `booking`, `order` |
| `business_id` | Superadmin only | Ignored or rejected for business admin (path defines tenant) |
| `entity_id` | Both | Optional drill-down |
| `accepted_after` / `accepted_before` | Both | ⏳ Slice 17+ if simple; validate ISO datetime |
| `legal_consent_version` | Both | ⏳ When lawyer-reviewed versions exist |

### Pagination

| Parameter | Recommendation |
|-----------|----------------|
| `limit` | Default `25`; max `100` |
| `offset` | Acceptable for MVP audit volumes |
| `cursor` | Optional later if offset performance degrades |

**Response envelope:** Match existing list endpoints (e.g. `{ items: [...], total: N, limit, offset }`) — do not invent a new pagination shape.

---

## G. Future implementation plan

### Slice 17 — Superadmin read-only API ✅

| Task | Deliverable |
|------|-------------|
| Repository | `list_consent_records` / `count_consent_records` — summary fields only |
| Schema | `LegalConsentRecordSummary` in `legal_consent_records.py` |
| Route | `GET /api/v1/superadmin/legal-consents` |
| Auth | `require_superadmin` |
| Tests | `test_superadmin_legal_consents.py` — auth, filters, pagination, data minimization |

**Pagination:** Uses existing superadmin `{ data, meta: { page, limit, total } }` shape; default `limit=25`, max `100`.

### Slice 18 — Business admin read-only API ✅

| Task | Deliverable |
|------|-------------|
| Route | `GET /api/v1/businesses/{business_id}/legal-consents` |
| Auth | `get_business_for_admin_or_403` — owner/admin membership; cross-business → `403` |
| Repository | `list_consent_records_for_business` / `count_consent_records_for_business` |
| Tests | `test_business_legal_consents.py` — tenant isolation, auth, filters, pagination |

### Slice 19 — Admin UI tables

| Task | Deliverable |
|------|-------------|
| Superadmin page | Read-only table; source, entity, version, timestamps |
| Business admin page | Same columns; scoped to current business |
| No sensitive data | No expandable rows with `form_data` or client contact fields |

### Slice 20+ — Export / data-subject flows

| Task | Deliverable |
|------|-------------|
| Retention policy | Legal + ops definition |
| Account deletion | Include consent row handling |
| Data export request | User/business export may attach consent summaries |
| IP/user-agent | Only if counsel requires and Privacy Policy discloses |

---

## H. Legal caveats

- **Not legal compliance** — read access to consent rows does not satisfy GDPR, 152-FZ, or other regimes by itself.
- **Lawyer review required** — who may view consent audit data, for how long, and in what form must be confirmed by counsel.
- **Retention / deletion policy** — still undefined; read APIs must not imply indefinite retention or unrestricted export.
- **Account deletion / data export** — consent records may need inclusion in erasure or portability flows; design only in Slice 20+.
- **No final legal text** — `legal_consent_version` remains `draft-placeholder-v1` until lawyer-reviewed versions exist.
- **No IP/user-agent** — not collected; do not add in read layer until policy allows collection and disclosure.

---

**Slice 16:** Consent records read/admin access **design only** — no API, UI, or migration changes.

**Slice 17:** Superadmin read-only API — `GET /api/v1/superadmin/legal-consents`; data-minimized; not legal compliance.

**Slice 18:** Business admin read-only API — `GET /api/v1/businesses/{business_id}/legal-consents`; tenant-scoped; not legal compliance.

**Last updated:** Phase 7 Slice 18 — business admin consent records read API (not legal advice).
