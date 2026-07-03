# Consent Audit Storage Plan — Phase 7 (Slice 14)

**Purpose:** Design a safe consent audit storage strategy before implementation.  
**Status:** Implemented (Slice 15) — `legal_consent_records` table writes on registration, public booking, and public order. **Not legal compliance** — lawyer review, retention/deletion policy, and IP/user-agent collection still future work.  
**Disclaimer:** This document is **not legal advice** and does **not** claim legal compliance. Final policies, retention rules, and consent wording require qualified legal review.

Related: [LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md)

---

## A. Current status

| Item | Status |
|------|--------|
| **Legal placeholder pages** | `/legal/terms`, `/legal/privacy`, `/legal/consent`, `/legal/cookies` — draft only (Slice 11) |
| **Frontend consent checkboxes** | Registration, public booking, public order/request (Slice 12) |
| **Backend consent enforcement** | `legal_consent_accepted: true` required on register, public booking, public order APIs (Slice 13) |
| **Registration consent storage** | Draft metadata in existing `business.settings` JSONB (`legal_consent_accepted`, `legal_consent_version`, `legal_consent_source`, `legal_consent_recorded_at`) |
| **Booking/order consent storage** | ✅ `legal_consent_records` rows (Slice 15) |
| **Full consent audit trail** | ⏳ Authoritative table implemented; read/admin access designed (Slice 16); retention/deletion/export — future |
| **Consent records read access** | ✅ Superadmin API (Slice 17); business admin API (Slice 18) and UI (Slice 19) — future |
| **Lawyer-reviewed legal text** | **Not done** — launch blocker |

**Launch rule:** Do not claim compliance. Do not point public marketing traffic at the platform until legal documents are lawyer-reviewed and consent audit flows are confirmed by counsel.

---

## B. Storage options considered

### Option A — Existing JSON fields / `form_data`

**Approach:** Store consent flags inside `business.settings`, booking notes, or order `form_data`.

| Pros | Cons |
|------|------|
| Fast to add if a field already exists | Mixes legal audit data with user/business form data |
| No new table if JSONB column exists | Harder to query across entities for consent reports |
| Registration already uses `business.settings` | May leak audit metadata into admin UIs that show `form_data` |
| | Booking model has no general metadata JSONB |
| | Pollutes user-submitted request text with system fields |

**Decision:** **Not preferred** as primary storage. Registration draft metadata in `business.settings` (Slice 13) is acceptable as interim context only; booking/order should not use `form_data` for consent audit.

---

### Option B — `audit_log` only

**Approach:** Reuse existing `audit_logs` table with a consent-related action type.

| Pros | Cons |
|------|------|
| Table and repository patterns already exist | Not purpose-built for consent records |
| Simple append-only trail | Harder to build consent-specific reports (by version, source, entity) |
| Fits operational audit narrative | Mixes consent events with admin actions, plan changes, etc. |
| | `log_metadata` shape is generic — weaker schema for legal audit queries |

**Decision:** **Useful supplementary trail**, not primary storage. Slice 15 may optionally mirror consent events to `audit_log` for ops visibility, but consent records need a dedicated table.

---

### Option C — Separate `legal_consent_records` table

**Approach:** New table written as a side-effect after successful entity creation.

| Pros | Cons |
|------|------|
| Clean audit boundary — consent data separate from product payloads | Requires Alembic migration |
| Queryable by business, source, version, date | Requires model, repository, service, tests |
| Extensible (version hashes, IP/UA later if counsel requires) | Small amount of new backend code in Slice 15 |
| Minimal effect on current site logic — write-only at first | |
| Does not change booking/order schemas for business users | |
| Supports future legal/audit needs (export, retention, deletion) | |

**Decision:** **Preferred** primary storage for consent audit.

---

## C. Proposed table shape

Draft table: **`legal_consent_records`**

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID PK | Default `uuid4` |
| `business_id` | UUID FK nullable | Business context; set for all three sources |
| `user_id` | UUID FK nullable | Owner on registration |
| `client_id` | UUID FK nullable | Guest/client on booking or order when known |
| `source` | enum / string | `registration` · `public_booking` · `public_order` |
| `entity_type` | enum / string | `business` · `booking` · `order` |
| `entity_id` | UUID nullable | Populated after entity creation |
| `legal_consent_version` | string | e.g. `draft-placeholder-v1` until lawyer-reviewed versions exist |
| `accepted_at` | timestamptz | When consent was accepted (server time at write) |
| `created_at` | timestamptz | Row insert time (may match `accepted_at`) |

**Indexes (draft):** `(business_id, created_at)`, `(entity_type, entity_id)`, `(source, created_at)`.

**Future optional fields** (do not add in first implementation unless legal review requires):

- `ip_address`
- `user_agent`
- `terms_version`
- `privacy_policy_version`
- `consent_text_hash`

**Note:** Do not collect IP or user-agent in Slice 15 unless counsel confirms necessity and disclosure in the Privacy Policy.

---

## D. Integration plan

Consent records are created **after** the primary entity exists, **in the same database transaction** where practical.

### Registration

**Trigger:** After successful user + business + member + subscription creation (existing `auth_service.register_business_owner` flow).

| Field | Value |
|-------|--------|
| `source` | `registration` |
| `entity_type` | `business` |
| `entity_id` | `business.id` |
| `user_id` | `user.id` |
| `business_id` | `business.id` |
| `legal_consent_version` | `draft-placeholder-v1` (constant until lawyer-reviewed versioning) |

**Note:** Existing `business.settings` consent keys (Slice 13) can remain for backward compatibility; Slice 15 adds the authoritative row in `legal_consent_records`. Long term, settings keys may be deprecated in favor of the table.

### Public booking

**Trigger:** After successful booking + client resolution in `booking_service` (public create path).

| Field | Value |
|-------|--------|
| `source` | `public_booking` |
| `entity_type` | `booking` |
| `entity_id` | `booking.id` |
| `business_id` | `business.id` |
| `client_id` | `client.id` if known |

### Public order / request

**Trigger:** After successful order + client resolution in `order_service` (public create path).

| Field | Value |
|-------|--------|
| `source` | `public_order` |
| `entity_type` | `order` |
| `entity_id` | `order.id` |
| `business_id` | `business.id` |
| `client_id` | `client.id` if known |

### Transaction rules

1. **Same transaction:** Insert consent record in the same `session` commit as the entity when possible.
2. **Fail closed:** If consent record insert fails, roll back the transaction — do not create user/booking/order without audit row.
3. **No API response change:** Public and register responses stay unchanged; consent storage is internal.
4. **No frontend change:** Frontend already sends `legal_consent_accepted: true`; Slice 15 is backend-only.
5. **No duplicate on retry:** Idempotency is not required for MVP; failed transactions should not leave orphan entities without consent rows.

---

## E. Why this should not break current logic

| Concern | Mitigation |
|---------|------------|
| Public API already requires consent | Slice 13 enforcement unchanged; storage is additive |
| Frontend already sends `legal_consent_accepted` | No UI or payload changes in Slice 15 |
| New table is write-only at first | No existing reads depend on `legal_consent_records` |
| Admin booking/order UIs | Unchanged — no consent fields in admin forms |
| `form_data` / `business.settings` | Unchanged for business users; no consent mixed into order request text |
| API contracts | Response shapes unchanged |
| Stripe / auth | Out of scope — no changes |
| Performance | One extra INSERT per consenting action — negligible |

The table is an **append-only audit side-effect**. Existing product behavior continues; only successful submissions gain a durable consent row.

---

## F. Future Slice 15 implementation plan

Small, reviewable steps:

| Step | Deliverable |
|------|-------------|
| 1 | SQLAlchemy model `LegalConsentRecord` + Alembic migration |
| 2 | Enums/constants: `ConsentSource`, `ConsentEntityType`, `LEGAL_CONSENT_VERSION` |
| 3 | `LegalConsentRepository` + `LegalConsentService.record_consent(...)` |
| 4 | Wire writes in `auth_service` (registration), `booking_service` (public create), `order_service` (public create) |
| 5 | Tests: record created on success; no record when consent missing/false; no orphan entity if consent insert fails; no duplicate records on rolled-back transaction |
| 6 | Keep API responses unchanged; no frontend changes |
| 7 | Update docs; run full backend + frontend + security checks |

**Optional (later):** Mirror high-level event to `audit_log` for ops dashboards — not required for Slice 15 MVP.

---

## G. Launch / legal caveats

- **Not legal compliance** — storing consent rows does not satisfy GDPR, 152-FZ, or other regimes without lawyer-reviewed text, lawful basis, retention policy, and user rights processes.
- **Lawyer-reviewed legal text** — still required before public launch; version field must track real policy versions after review.
- **Retention / deletion** — how long consent records are kept and how they are deleted on account erasure is **future work** (policy + implementation).
- **Account deletion / data export** — consent records must be included in future data-subject flows; not in Slice 15.
- **IP / user-agent** — do not collect unless legal review requires and Privacy Policy discloses it.
- **Demo / seed data** — `seed_demo.py` should not create fake consent records unless explicitly added for test realism; document if added.

---

**Slice 15:** `legal_consent_records` table + migration `0010` + repository/service + writes on register/booking/order — not legal compliance.

**Slice 16:** Records remain **write-only**; read/admin access design in [CONSENT_RECORDS_ACCESS_PLAN.md](./CONSENT_RECORDS_ACCESS_PLAN.md) — staged superadmin API (Slice 17), business admin API (Slice 18), UI (Slice 19); no routes added in Slice 16.

**Slice 17:** Superadmin read-only `GET /api/v1/superadmin/legal-consents` — paginated, filterable, data-minimized; not legal compliance.

**Last updated:** Phase 7 Slice 17 — superadmin consent records read API (not legal advice).
