# Service Platform PWA — Data Model Draft

PostgreSQL-oriented schema. All tenant-scoped tables include `business_id` unless noted.  
Timestamps: `created_at`, `updated_at` on all tables (UTC).  
IDs: UUID v4 primary keys unless noted.

---

## Entity Relationship Overview

```
users ─────┬──── business_members ──── businesses ──── subscriptions
           │                              │
           │                              ├── services
           │                              ├── working_hours
           │                              ├── working_breaks
           │                              ├── unavailable_times
           │                              │
           └──── clients ─────────────────┼── bookings
                                          ├── orders ─── order_messages
                                          ├── payments
                                          └── notifications

audit_logs (platform-wide, references users/businesses)
```

---

## 1. users

Platform login accounts (admins, superadmins, and clients who register).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NULL if magic-link only |
| full_name | VARCHAR(255) | |
| phone | VARCHAR(50) | nullable |
| role | ENUM | `client`, `business_admin`, `superadmin` |
| email_verified_at | TIMESTAMPTZ | nullable |
| is_active | BOOLEAN | default true |
| last_login_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Relationships:**
- One user → many `business_members` (admin)
- One user → many `clients` (different businesses)
- One user → many `notifications` (as recipient)
- One user → many `audit_logs` (as actor)

**Notes:**
- A person can be `business_admin` for their salon and `client` at another business (separate rows).
- Superadmin is a global role; not tied to `business_members`.

---

## 2. businesses

Tenant root entity.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL |
| slug | VARCHAR(100) | UNIQUE, URL-safe |
| description | TEXT | |
| logo_url | VARCHAR(500) | nullable |
| contact_email | VARCHAR(255) | |
| contact_phone | VARCHAR(50) | |
| address | TEXT | |
| timezone | VARCHAR(50) | e.g. `America/New_York` |
| operating_mode | ENUM | `booking_only`, `orders_only`, `both` |
| status | ENUM | `active`, `suspended`, `pending_setup` |
| settings | JSONB | policies, feature flags (see below) |
| stripe_account_id | VARCHAR(255) | Connect account |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**settings JSONB example:**
```json
{
  "auto_confirm_bookings": true,
  "cancellation_hours": 24,
  "max_advance_booking_days": 60,
  "min_advance_booking_hours": 2,
  "allow_guest_checkout": true,
  "slot_interval_minutes": 30,
  "booking_buffer_minutes": 0,
  "require_payment_default": false,
  "notification_email_enabled": true
}
```

**Relationships:**
- One business → one active `subscriptions` row
- One business → many `business_members`, `services`, `clients`, `bookings`, `orders`, etc.

---

## 3. business_members

Links admin users to businesses.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK → businesses |
| user_id | UUID | FK → users |
| role | ENUM | `owner`, `admin`, `staff` (MVP: owner/admin only) |
| invited_at | TIMESTAMPTZ | |
| joined_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Constraints:** UNIQUE (`business_id`, `user_id`)

---

## 4. clients

End-customer record per business (CRM).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK → businesses |
| user_id | UUID | FK → users, nullable (guest) |
| full_name | VARCHAR(255) | NOT NULL |
| email | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| notes | TEXT | admin-only |
| source | ENUM | `registered`, `guest`, `admin_created` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Constraints:** UNIQUE (`business_id`, `email`) WHERE email IS NOT NULL

**Relationships:**
- One client → many `bookings`, `orders`, `payments`

---

## 5. services

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK → businesses |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| type | ENUM | `booking`, `order` — **immutable after create** |
| duration_minutes | INT | required if type=booking |
| price_cents | INT | nullable for quote orders |
| currency | CHAR(3) | default `USD` |
| price_type | ENUM | `fixed`, `free`, `quote` |
| require_payment | BOOLEAN | |
| is_active | BOOLEAN | default true |
| sort_order | INT | display order |
| metadata | JSONB | custom form fields for orders |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**metadata example (order service):**
```json
{
  "form_fields": [
    { "key": "description", "type": "textarea", "label": "Describe your request", "required": true },
    { "key": "photo_url", "type": "text", "label": "Reference photo URL", "required": false }
  ]
}
```

**Status values:** `is_active` true/false (no separate status enum)

---

## 6. bookings

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK |
| service_id | UUID | FK → services (type must be booking) |
| client_id | UUID | FK → clients |
| reference | VARCHAR(20) | e.g. `BKG-2026-1042` UNIQUE per business |
| starts_at | TIMESTAMPTZ | NOT NULL |
| ends_at | TIMESTAMPTZ | computed: starts_at + duration |
| status | ENUM | see below |
| client_notes | TEXT | |
| admin_notes | TEXT | internal |
| cancelled_at | TIMESTAMPTZ | |
| cancelled_by | ENUM | `client`, `admin`, `system` |
| cancellation_reason | TEXT | |
| rescheduled_from_id | UUID | FK → bookings, nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Status values:**
| Status | Meaning |
|--------|---------|
| `pending` | Awaiting admin confirm (if not auto-confirm) |
| `pending_payment` | Checkout started, not completed |
| `confirmed` | Active appointment |
| `completed` | Service delivered |
| `cancelled` | Cancelled by client/admin/system |
| `no_show` | Client did not attend |

**Indexes:**
- (`business_id`, `starts_at`)
- (`business_id`, `status`)
- (`business_id`, `starts_at`, `ends_at`) for overlap checks

**Relationships:**
- One booking → zero or more `payments`
- Service must have `type = booking`

---

## 7. orders

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK |
| service_id | UUID | FK → services (type must be order) |
| client_id | UUID | FK → clients |
| reference | VARCHAR(20) | e.g. `ORD-2026-0042` |
| status | ENUM | see below |
| form_data | JSONB | client-submitted field values |
| quoted_price_cents | INT | nullable until quoted |
| admin_notes | TEXT | internal |
| decline_reason | TEXT | shown to client |
| accepted_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Status values:**
| Status | Meaning |
|--------|---------|
| `submitted` | Awaiting admin review |
| `pending_payment` | Payment required before work |
| `accepted` | Admin accepted |
| `in_progress` | Work underway |
| `completed` | Done |
| `declined` | Admin declined |
| `cancelled` | Cancelled by client or admin |

**Relationships:**
- One order → many `order_messages`
- One order → zero or more `payments`

---

## 8. order_messages

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| order_id | UUID | FK → orders |
| business_id | UUID | FK (denormalized for queries) |
| sender_type | ENUM | `client`, `admin` |
| sender_user_id | UUID | FK → users, nullable for guest client |
| body | TEXT | NOT NULL |
| read_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | |

**Indexes:** (`order_id`, `created_at`)

---

## 9. payments

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK |
| client_id | UUID | FK |
| booking_id | UUID | FK, nullable |
| order_id | UUID | FK, nullable |
| amount_cents | INT | NOT NULL |
| currency | CHAR(3) | |
| type | ENUM | `deposit`, `full`, `balance`, `refund` |
| status | ENUM | see below |
| stripe_payment_intent_id | VARCHAR(255) | |
| stripe_checkout_session_id | VARCHAR(255) | |
| stripe_refund_id | VARCHAR(255) | nullable |
| metadata | JSONB | |
| paid_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Constraint:** CHECK (booking_id IS NOT NULL OR order_id IS NOT NULL)

**Status values:**
| Status | Meaning |
|--------|---------|
| `pending` | Session created |
| `processing` | In flight |
| `succeeded` | Paid |
| `failed` | Failed |
| `refunded` | Full refund |
| `partially_refunded` | Partial |

---

## 10. working_hours

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK |
| day_of_week | SMALLINT | 0=Sunday … 6=Saturday |
| is_open | BOOLEAN | |
| opens_at | TIME | nullable if closed |
| closes_at | TIME | nullable if closed |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Constraint:** UNIQUE (`business_id`, `day_of_week`)

---

## 11. working_breaks

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK |
| label | VARCHAR(100) | e.g. "Lunch" |
| day_of_week | SMALLINT | nullable = every day |
| starts_at | TIME | |
| ends_at | TIME | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

## 12. unavailable_times

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK |
| starts_at | TIMESTAMPTZ | |
| ends_at | TIMESTAMPTZ | |
| reason | VARCHAR(255) | e.g. "Vacation" |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Index:** (`business_id`, `starts_at`, `ends_at`)

---

## 13. notifications

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK, nullable for superadmin |
| user_id | UUID | FK → recipient |
| channel | ENUM | `email`, `push`, `in_app` |
| event_type | VARCHAR(100) | e.g. `booking.confirmed` |
| title | VARCHAR(255) | |
| body | TEXT | |
| payload | JSONB | entity refs, deep links |
| status | ENUM | `pending`, `sent`, `failed`, `read` |
| sent_at | TIMESTAMPTZ | |
| read_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

---

## 14. subscriptions

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK, UNIQUE |
| plan | ENUM | `free`, `starter`, `business`, `pro` |
| status | ENUM | `active`, `past_due`, `cancelled`, `trialing` |
| stripe_subscription_id | VARCHAR(255) | nullable on free |
| stripe_customer_id | VARCHAR(255) | |
| current_period_start | TIMESTAMPTZ | |
| current_period_end | TIMESTAMPTZ | |
| usage_bookings_count | INT | reset each period |
| usage_orders_count | INT | reset each period |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

## 15. audit_logs

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| actor_user_id | UUID | FK → users |
| business_id | UUID | FK, nullable |
| action | VARCHAR(100) | e.g. `business.suspended` |
| entity_type | VARCHAR(50) | e.g. `booking` |
| entity_id | UUID | |
| old_values | JSONB | |
| new_values | JSONB | |
| ip_address | INET | |
| user_agent | TEXT | |
| created_at | TIMESTAMPTZ | |

**Index:** (`business_id`, `created_at`), (`actor_user_id`, `created_at`)

---

## Slot Availability Logic (Derived, Not Stored)

Available slots for a date =

1. Generate intervals from `working_hours` for that weekday.
2. Subtract `working_breaks` (global or day-specific).
3. Subtract `unavailable_times` overlapping that date.
4. Subtract existing `bookings` with status in (`pending`, `pending_payment`, `confirmed`) overlapping slot.
5. Apply `min_advance_booking_hours` and `max_advance_booking_days`.
6. Chunk by `slot_interval_minutes` + service `duration_minutes` + `booking_buffer_minutes`.

Use transactional row lock or advisory lock on (`business_id`, `starts_at`) when creating booking.

---

## Plan Limit Enforcement

| Plan | Check on |
|------|----------|
| services count | service create |
| bookings/month | booking create |
| orders/month | order create |
| clients count | client create |
| staff count | member invite |
| payments | plan must be ≥ starter |

Store counters on `subscriptions` or compute with COUNT for period (prefer counter + periodic reconcile).

---

## Migration Order (Implementation Hint)

1. users, businesses, business_members, subscriptions
2. clients, services
3. working_hours, working_breaks, unavailable_times
4. bookings, orders, order_messages
5. payments
6. notifications, audit_logs

---

## Soft Delete Policy (MVP)

- **No hard delete** on bookings, orders, payments — status transitions only.
- Services: `is_active = false` instead of delete.
- Clients: retain; archive post-MVP.
- Businesses: `status = suspended` instead of delete.
