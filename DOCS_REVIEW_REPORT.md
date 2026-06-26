# Service Platform PWA — Documentation Review Report

**Date:** 2026-06-26  
**Reviewer:** Pre-implementation consistency review  
**Scope:** PRODUCT_SPEC, USER_FLOWS, WIREFRAMES, DATA_MODEL_DRAFT, API_DRAFT, MVP_PLAN

---

## Summary

All six planning documents were cross-checked for terminology, status enums, service-type rules, wireframe-to-API coverage, data-model alignment, MVP scope, security, and payment rules.

**Overall:** The documentation set is coherent and implementation-ready. A small number of contradictions were found—mostly omitted statuses in narrative sections, one mislabeled wireframe action, a per-service vs business-level setting mix-up, and three missing API endpoints. All were fixed with targeted edits (no full rewrites).

**Verdict:** **Start Phase 1 backend.** No blocking doc gaps remain.

---

## Contradictions Found

### 1. Booking statuses incomplete in PRODUCT_SPEC and USER_FLOWS

| Source | Issue |
|--------|-------|
| `PRODUCT_SPEC.md` §4.1 | Lifecycle omitted `pending_payment` |
| `USER_FLOWS.md` C6 | Client-visible states omitted `pending_payment` |
| `DATA_MODEL_DRAFT.md`, `API_DRAFT.md`, `MVP_PLAN.md` | Already correct |

**Canonical booking statuses:** `pending`, `pending_payment`, `confirmed`, `completed`, `cancelled`, `no_show`

### 2. Order statuses incomplete in PRODUCT_SPEC and USER_FLOWS

| Source | Issue |
|--------|-------|
| `PRODUCT_SPEC.md` §4.2 | Lifecycle omitted `pending_payment` |
| `USER_FLOWS.md` C7 | Client-visible states omitted `pending_payment` |
| `DATA_MODEL_DRAFT.md` | Already correct |

**Canonical order statuses:** `submitted`, `pending_payment`, `accepted`, `in_progress`, `completed`, `declined`, `cancelled`

### 3. Auto-confirm scope

| Source | Issue |
|--------|-------|
| `USER_FLOWS.md` A1 (original) | Listed `auto-confirm bookings` as a per-service option |
| `DATA_MODEL_DRAFT.md`, `API_DRAFT.md` | `auto_confirm_bookings` is a **business** setting in `settings` JSONB |

### 4. Setting name in booking flow

| Source | Issue |
|--------|-------|
| `USER_FLOWS.md` C3 (original) | Referenced `auto_confirm` instead of `auto_confirm_bookings` |

### 5. Admin refunds in PRODUCT_SPEC

| Source | Issue |
|--------|-------|
| `PRODUCT_SPEC.md` §3.2 (original) | Said admin "Views and refunds payments" |
| `PRODUCT_SPEC.md` §7, `USER_FLOWS.md` C9, `API_DRAFT.md` | Refund UI is post-MVP; Stripe dashboard only |

### 6. Wireframe booking action label

| Source | Issue |
|--------|-------|
| `WIREFRAMES.md` MA2 | Pending booking showed `[Confirm] [Decline]` — **Decline** is order terminology |
| Bookings use **Cancel**, not Decline |

### 7. Team members in settings wireframe vs MVP scope

| Source | Issue |
|--------|-------|
| `WIREFRAMES.md` MA7 | Showed Team members as active settings item |
| `PRODUCT_SPEC.md` §7, `MVP_PLAN.md` | Team invite UI is post-MVP; single admin role in MVP |

### 8. Missing API endpoints for wireframe screens

| Screen | Gap |
|--------|-----|
| MC3, MC4 service detail | No `GET /public/b/{slug}/services/{serviceId}` |
| MA2, DA3 admin booking detail | No `GET /businesses/{businessId}/bookings/{bookingId}` |
| C5 payment success page | No session verification endpoint after Stripe redirect |
| Admin service edit | No `GET /businesses/{businessId}/services/{serviceId}` (list-only before) |

### 9. Status filter mapping undocumented in API

| Endpoint | Gap |
|----------|-----|
| `GET /me/bookings?status=upcoming\|past\|cancelled` | UI filters did not map to underlying status enums |
| `GET /me/orders?status=active\|completed\|declined` | Same |

### 10. Security rules scattered

Tenant isolation was stated in `PRODUCT_SPEC.md` and implied in `DATA_MODEL_DRAFT.md` intro, but not consolidated. `API_DRAFT.md` lacked an explicit access-control section.

### 11. Notification settings storage

`API_DRAFT.md` defined `/notification-settings` endpoints but `DATA_MODEL_DRAFT.md` `settings` JSONB did not include `notification_settings` structure.

---

## Fixes Made

| File | Change |
|------|--------|
| `PRODUCT_SPEC.md` | Added `pending_payment` to booking and order lifecycles; clarified admin payment view vs refund UI; expanded glossary (terminology, `price_type`, `operating_mode`, UI vs entity names) |
| `USER_FLOWS.md` | Added `pending_payment` to C6/C7; fixed `auto_confirm_bookings` in C3; moved auto-confirm to business setting in A1 |
| `WIREFRAMES.md` | MA2: `Decline` → `Cancel` on booking; MA7: Team members marked post-MVP |
| `DATA_MODEL_DRAFT.md` | Added service type constraint table; `notification_settings` in settings JSONB; new **Tenant Isolation & Security** section |
| `API_DRAFT.md` | Added Security & Access Control + Payments MVP rules sections; added 4 endpoints; documented status filter mappings |
| `MVP_PLAN.md` | Phase 1 deliverable for public service detail + admin booking GET; Phase 3 notes for post-MVP week calendar and team UI |

---

## Verified Consistent (No Change Needed)

### Terminology

| Topic | Canonical term | Notes |
|-------|----------------|-------|
| Entity | **booking** | UI may say "appointment" |
| Entity | **order** | UI may say "request" |
| Person | **client** | Not "customer" in code |
| Tenant | **business** | `businesses` table; "tenant" is architecture alias |
| Pricing | **price_type** | `fixed`, `free`, `quote` — no `price_mode` anywhere |
| Mode | **operating_mode** | `booking_only`, `orders_only`, `both` — consistent everywhere |

### Service type rules

`booking` and `order` are used consistently. Booking services require duration and use schedule/availability; order services have no duration, no availability, and support `order_messages`.

### Payment rules (after fixes)

- MVP: Stripe Checkout only, no in-app card form
- Payment links to `booking_id` OR `order_id`
- Webhook idempotency documented in API + MVP Phase 4
- Refunds: Stripe dashboard only in MVP

### Wireframe → API coverage (after fixes)

| Screen | API support |
|--------|-------------|
| Home / services list | `GET /public/b/{slug}`, `GET /public/b/{slug}/services` |
| Service detail | `GET /public/b/{slug}/services/{serviceId}` ✓ added |
| Date/time / availability | `GET /public/b/{slug}/availability` |
| Create booking | `POST /public/b/{slug}/bookings` |
| My bookings | `GET /me/bookings`, `GET /me/bookings/{id}`, cancel/reschedule |
| Create order | `POST /public/b/{slug}/orders` |
| My requests | `GET /me/orders`, `GET /me/orders/{id}` |
| Order messages | `GET/POST /orders/{orderId}/messages` |
| Admin dashboard | `GET /businesses/{id}/dashboard` |
| Admin bookings | `GET/PATCH /businesses/{id}/bookings`, `GET .../bookings/{id}` ✓ added |
| Admin orders | Full CRUD + accept/decline |
| Admin clients | `GET/PATCH /businesses/{id}/clients` |
| Admin schedule | Schedule endpoints |
| Admin payments | `GET /businesses/{id}/payments` |
| Payment success | `GET /payments/checkout/verify` ✓ added |
| Settings | `GET/PATCH /businesses/{id}`, stripe + notification-settings |

### MVP scope alignment

`MVP_PLAN.md` phases align with `PRODUCT_SPEC.md` MVP scope. Out-of-scope items (native apps, SMS, per-staff calendars, refund UI, file uploads, in-app cards, team UI) are correctly deferred. Phase 6 wrapper matches "Native iOS/Android apps — PWA first."

---

## Open Questions

These do not block Phase 1 but should be decided during implementation:

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | **Backend stack:** Node (Fastify/Express) vs Python (FastAPI)? | Decide in Phase 1 kickoff; docs remain stack-agnostic |
| 2 | **Guest order/booking access:** How does a guest view "My orders" without login? | MVP: email magic link post-MVP; guest sees confirmation screen only, or require login for history |
| 3 | **Logo upload:** Wireframe shows upload; no upload API defined | MVP: external URL in `PATCH /businesses/{id}` `logo_url`; file upload post-MVP |
| 4 | **Client payment history:** PRODUCT_SPEC mentions it; no `/me/payments` endpoint | Defer to Phase 4 or post-MVP; not on critical path |
| 5 | **Push notifications in Starter plan:** Monetization table includes push; MVP Phase 5 is stretch | Ship email first; enable push when Phase 5 completes |
| 6 | **`pending_payment` slot hold duration:** USER_FLOWS says 15 min | Confirm in Phase 4 implementation; document in config |
| 7 | **Order `accepted` vs `in_progress`:** Accept endpoint allows jumping to `in_progress` | Keep both statuses; accept may set either per admin choice |
| 8 | **Password change endpoint:** Settings wireframe references it | Add `POST /auth/change-password` in Phase 1 or 3 when auth is built |

---

## Readiness for Phase 1 Backend

| Criterion | Status |
|-----------|--------|
| Entity model defined | ✓ 15 tables with fields and relationships |
| Status enums canonical | ✓ Fixed and aligned |
| API surface documented | ✓ ~55 endpoints including additions |
| Auth and tenant rules clear | ✓ Security section added |
| Slot logic specified | ✓ DATA_MODEL derived logic |
| Plan limits defined | ✓ PRODUCT_SPEC + DATA_MODEL |
| Tests expectations | ✓ MVP_PLAN Phase 1 |
| No code required yet | ✓ Docs only |

**Phase 1 can implement:** migrations, auth, business/services/schedule/bookings/orders/clients/messages, plan limits, superadmin, audit logs, availability engine, OpenAPI spec.

**Phase 1 should NOT implement:** Stripe, email notifications, frontend.

---

## Recommendation

### **Start Phase 1 backend**

Documentation is internally consistent after the fixes above. The data model, API draft, and MVP plan form a sufficient contract for backend skeleton work. Resolve open questions 1–2 during the first implementation week; the rest can wait until Phases 3–4.

---

## Changed Files (This Review)

1. `PRODUCT_SPEC.md`
2. `USER_FLOWS.md`
3. `WIREFRAMES.md`
4. `DATA_MODEL_DRAFT.md`
5. `API_DRAFT.md`
6. `MVP_PLAN.md`
7. `DOCS_REVIEW_REPORT.md` *(new)*
