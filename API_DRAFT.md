# Service Platform PWA — API Draft

REST API v1. Base URL: `https://api.example.com/v1`

## Conventions

| Topic | Rule |
|-------|------|
| Auth | `Authorization: Bearer <access_token>` |
| Tenant context | Business admin routes require `business_id` in path or JWT claim |
| Public routes | `/public/b/{slug}/...` — no auth for catalog/slots |
| Pagination | `?page=1&limit=20` → `{ data: [], meta: { page, limit, total } }` |
| Errors | `{ error: { code, message, details? } }` |
| IDs | UUID strings |
| Money | Integer cents in API; display formatted client-side |
| Dates | ISO 8601 UTC |

### Standard Error Codes

`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `PLAN_LIMIT_EXCEEDED`, `SLOT_UNAVAILABLE`, `PAYMENT_REQUIRED`

### Security & Access Control

| Rule | Implementation |
|------|----------------|
| Tenant isolation | All business-scoped routes verify `business_id` via `business_members` membership |
| Admin cross-tenant | Admin requests for a `business_id` the user does not belong to → `403 FORBIDDEN` |
| Client data scope | `/me/*` routes return only records linked to the authenticated user's `clients` rows |
| Superadmin audit | All `PATCH /superadmin/*` mutations append to `audit_logs` |
| Public endpoints | `/public/b/{slug}/*` — no auth; expose only safe fields (no client PII, admin notes, or Stripe IDs) |
| Guest clients | Public booking/order may create `clients` with `user_id: null`; messages use session/token binding post-create |

### Payments (MVP rules)

- **Stripe Checkout only** — no in-app card form (no Stripe Elements).
- Each payment links to exactly one `booking_id` **or** `order_id`.
- `POST /webhooks/stripe` must be **idempotent** (store processed event IDs; ignore duplicates).
- Refunds: processed in Stripe dashboard only in MVP; no refund API or admin refund UI.

---

## Auth

### POST /auth/register

**Purpose:** Create client or business owner account.

**Request:**
```json
{
  "email": "maria@salon.com",
  "password": "securePass123",
  "full_name": "Maria Garcia",
  "phone": "+15550100",
  "account_type": "business",
  "business": {
    "name": "Joe's Salon",
    "slug": "joes-salon",
    "operating_mode": "both",
    "timezone": "America/New_York"
  }
}
```

**Response `201`:**
```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "email": "maria@salon.com",
    "full_name": "Maria Garcia",
    "role": "business_admin"
  },
  "business": {
    "id": "b2c3d4e5-...",
    "name": "Joe's Salon",
    "slug": "joes-salon"
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600
  }
}
```

---

### POST /auth/login

**Purpose:** Email/password login.

**Request:**
```json
{
  "email": "maria@salon.com",
  "password": "securePass123"
}
```

**Response `200`:**
```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "email": "maria@salon.com",
    "role": "business_admin"
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600
  }
}
```

---

### POST /auth/refresh

**Purpose:** Rotate access token.

**Request:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "expires_in": 3600
}
```

---

### POST /auth/logout

**Purpose:** Invalidate refresh token.

**Request:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response `204`:** No body.

---

### GET /auth/me

**Purpose:** Current user profile + memberships.

**Response `200`:**
```json
{
  "id": "a1b2c3d4-...",
  "email": "maria@salon.com",
  "full_name": "Maria Garcia",
  "role": "business_admin",
  "businesses": [
    {
      "id": "b2c3d4e5-...",
      "name": "Joe's Salon",
      "slug": "joes-salon",
      "role": "owner"
    }
  ]
}
```

---

## Business (Admin)

### GET /businesses/{businessId}

**Purpose:** Get business details (admin).

**Response `200`:**
```json
{
  "id": "b2c3d4e5-...",
  "name": "Joe's Salon",
  "slug": "joes-salon",
  "description": "Hair and beauty",
  "operating_mode": "both",
  "timezone": "America/New_York",
  "status": "active",
  "settings": {
    "auto_confirm_bookings": true,
    "cancellation_hours": 24,
    "max_advance_booking_days": 60,
    "slot_interval_minutes": 30
  },
  "subscription": {
    "plan": "starter",
    "usage_bookings_count": 42,
    "bookings_limit": 200
  }
}
```

---

### PATCH /businesses/{businessId}

**Purpose:** Update business profile and settings.

**Request:**
```json
{
  "name": "Joe's Salon & Spa",
  "description": "Updated description",
  "settings": {
    "auto_confirm_bookings": false,
    "cancellation_hours": 48
  }
}
```

**Response `200`:** Updated business object.

---

### GET /public/b/{slug}

**Purpose:** Public business landing info (no auth).

**Response `200`:**
```json
{
  "id": "b2c3d4e5-...",
  "name": "Joe's Salon",
  "slug": "joes-salon",
  "description": "Hair and beauty",
  "logo_url": "https://cdn.../logo.png",
  "operating_mode": "both",
  "contact_phone": "+15550199",
  "address": "123 Main St"
}
```

---

## Services

### GET /public/b/{slug}/services

**Purpose:** List active services for clients.

**Query:** `?type=booking|order`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "s1...",
      "name": "Haircut",
      "type": "booking",
      "description": "Classic cut",
      "duration_minutes": 30,
      "price_cents": 2500,
      "currency": "USD",
      "price_type": "fixed",
      "require_payment": true
    }
  ]
}
```

---

### GET /public/b/{slug}/services/{serviceId}

**Purpose:** Public service detail for booking or order flow entry (MC3, MC4).

**Response `200`:**
```json
{
  "id": "s1...",
  "name": "Haircut",
  "type": "booking",
  "description": "Classic cut and style",
  "duration_minutes": 30,
  "price_cents": 2500,
  "currency": "USD",
  "price_type": "fixed",
  "require_payment": true,
  "metadata": null
}
```

For `type: order`, `metadata` includes `form_fields` for the order form.

---

### GET /businesses/{businessId}/services/{serviceId}

**Purpose:** Admin get single service (edit form).

**Response `200`:** Full service object including `is_active`, `metadata`, `sort_order`.

---

### GET /businesses/{businessId}/services

**Purpose:** Admin list all services including inactive.

**Response `200`:** Paginated service list.

---

### POST /businesses/{businessId}/services

**Purpose:** Create service.

**Request:**
```json
{
  "name": "Haircut",
  "type": "booking",
  "description": "Classic cut and style",
  "duration_minutes": 30,
  "price_cents": 2500,
  "price_type": "fixed",
  "require_payment": true,
  "is_active": true
}
```

**Response `201`:** Created service object.

---

### PATCH /businesses/{businessId}/services/{serviceId}

**Purpose:** Update service (type immutable).

**Request:**
```json
{
  "name": "Premium Haircut",
  "price_cents": 3000,
  "is_active": true
}
```

**Response `200`:** Updated service.

---

### DELETE /businesses/{businessId}/services/{serviceId}

**Purpose:** Soft-deactivate service (`is_active: false`).

**Response `200`:**
```json
{
  "id": "s1...",
  "is_active": false
}
```

---

## Bookings

### GET /public/b/{slug}/availability

**Purpose:** Get available time slots for a date.

**Query:** `?service_id=s1...&date=2026-06-25`

**Response `200`:**
```json
{
  "date": "2026-06-25",
  "timezone": "America/New_York",
  "slots": [
    { "starts_at": "2026-06-25T14:00:00-04:00", "ends_at": "2026-06-25T14:30:00-04:00" },
    { "starts_at": "2026-06-25T14:30:00-04:00", "ends_at": "2026-06-25T15:00:00-04:00" }
  ]
}
```

---

### POST /public/b/{slug}/bookings

**Purpose:** Client creates booking (guest or authenticated).

**Request:**
```json
{
  "service_id": "s1...",
  "starts_at": "2026-06-25T14:30:00-04:00",
  "client_notes": "Prefer shorter on sides",
  "client": {
    "full_name": "Carl Lee",
    "email": "carl@email.com",
    "phone": "+15550199"
  }
}
```

**Response `201`:**
```json
{
  "id": "bk1...",
  "reference": "BKG-2026-1042",
  "status": "confirmed",
  "service": { "id": "s1...", "name": "Haircut" },
  "starts_at": "2026-06-25T14:30:00-04:00",
  "ends_at": "2026-06-25T15:00:00-04:00",
  "payment_required": true,
  "payment": {
    "id": "pay1...",
    "checkout_url": "https://checkout.stripe.com/..."
  }
}
```

---

### GET /me/bookings

**Purpose:** Client's own bookings across businesses.

**Query:** `?status=upcoming|past|cancelled`

**Status filter mapping:**
| Filter | Includes booking statuses |
|--------|---------------------------|
| `upcoming` | `pending`, `pending_payment`, `confirmed` (future `starts_at`) |
| `past` | `completed`, `no_show`, `confirmed` (past `starts_at`) |
| `cancelled` | `cancelled` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "bk1...",
      "reference": "BKG-2026-1042",
      "status": "confirmed",
      "business": { "name": "Joe's Salon", "slug": "joes-salon" },
      "service": { "name": "Haircut" },
      "starts_at": "2026-06-25T14:30:00-04:00",
      "ends_at": "2026-06-25T15:00:00-04:00"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3 }
}
```

---

### GET /me/bookings/{bookingId}

**Purpose:** Client booking detail.

**Response `200`:** Full booking with cancel/reschedule eligibility flags.

---

### POST /me/bookings/{bookingId}/cancel

**Purpose:** Client cancels booking.

**Request:**
```json
{
  "reason": "Schedule conflict"
}
```

**Response `200`:**
```json
{
  "id": "bk1...",
  "status": "cancelled",
  "cancelled_at": "2026-06-24T10:00:00Z"
}
```

---

### POST /me/bookings/{bookingId}/reschedule

**Purpose:** Client reschedules to new slot.

**Request:**
```json
{
  "starts_at": "2026-06-26T10:00:00-04:00"
}
```

**Response `200`:** Updated booking.

---

### GET /businesses/{businessId}/bookings

**Purpose:** Admin list bookings.

**Query:** `?date_from=2026-06-01&date_to=2026-06-30&status=confirmed&page=1`

**Response `200`:** Paginated bookings with client summary.

---

### POST /businesses/{businessId}/bookings

**Purpose:** Admin manually creates booking.

**Request:**
```json
{
  "service_id": "s1...",
  "client_id": "c1...",
  "starts_at": "2026-06-25T16:00:00-04:00",
  "admin_notes": "Walk-in",
  "status": "confirmed"
}
```

**Response `201`:** Created booking.

---

### PATCH /businesses/{businessId}/bookings/{bookingId}

**Purpose:** Admin update status/notes.

**Request:**
```json
{
  "status": "completed",
  "admin_notes": "Client satisfied"
}
```

**Response `200`:** Updated booking.

---

### GET /businesses/{businessId}/bookings/{bookingId}

**Purpose:** Admin booking detail (MA2, DA3 tap-through).

**Response `200`:** Full booking with client contact, service, status, notes, and action eligibility flags.

---

## Orders

### POST /public/b/{slug}/orders

**Purpose:** Client submits service order.

**Request:**
```json
{
  "service_id": "s2...",
  "form_data": {
    "description": "Lace front wig, 22 inch, color #4",
    "photo_url": "https://example.com/ref.jpg"
  },
  "client": {
    "full_name": "Fiona Ray",
    "email": "fiona@email.com",
    "phone": "+15550200"
  }
}
```

**Response `201`:**
```json
{
  "id": "ord1...",
  "reference": "ORD-2026-0042",
  "status": "submitted",
  "service": { "id": "s2...", "name": "Custom wig order" },
  "created_at": "2026-06-20T15:00:00Z"
}
```

---

### GET /me/orders

**Purpose:** Client's orders.

**Query:** `?status=active|completed|declined`

**Status filter mapping:**
| Filter | Includes order statuses |
|--------|-------------------------|
| `active` | `submitted`, `pending_payment`, `accepted`, `in_progress` |
| `completed` | `completed`, `cancelled` |
| `declined` | `declined` |

**Response `200`:** Paginated order list.

---

### GET /me/orders/{orderId}

**Purpose:** Client order detail with messages.

**Response `200`:**
```json
{
  "id": "ord1...",
  "reference": "ORD-2026-0042",
  "status": "in_progress",
  "service": { "name": "Custom wig order" },
  "form_data": { "description": "..." },
  "messages": [
    {
      "id": "m1...",
      "sender_type": "client",
      "body": "Lace front wig...",
      "created_at": "2026-06-20T15:00:00Z"
    }
  ],
  "can_message": true
}
```

---

### GET /businesses/{businessId}/orders

**Purpose:** Admin list orders.

**Query:** `?status=submitted&page=1`

**Response `200`:** Paginated orders.

---

### GET /businesses/{businessId}/orders/{orderId}

**Purpose:** Admin order detail.

**Response `200`:** Full order with client info and messages.

---

### POST /businesses/{businessId}/orders/{orderId}/accept

**Purpose:** Accept submitted order.

**Request:**
```json
{
  "status": "in_progress",
  "quoted_price_cents": 32000
}
```

**Response `200`:** Updated order.

---

### POST /businesses/{businessId}/orders/{orderId}/decline

**Purpose:** Decline order.

**Request:**
```json
{
  "decline_reason": "We don't work with this material type"
}
```

**Response `200`:** Updated order with `status: declined`.

---

### PATCH /businesses/{businessId}/orders/{orderId}

**Purpose:** Update status (complete, cancel).

**Request:**
```json
{
  "status": "completed"
}
```

**Response `200`:** Updated order.

---

### GET /orders/{orderId}/messages

**Purpose:** List messages (client or admin with access).

**Response `200`:**
```json
{
  "data": [
    {
      "id": "m1...",
      "sender_type": "admin",
      "body": "We can do that. Price will be $320.",
      "created_at": "2026-06-21T09:00:00Z"
    }
  ]
}
```

---

### POST /orders/{orderId}/messages

**Purpose:** Send message on order thread.

**Request:**
```json
{
  "body": "Sounds good, please proceed."
}
```

**Response `201`:** Created message.

---

## Payments

### POST /payments/checkout

**Purpose:** Create Stripe Checkout session for booking or order.

**Request:**
```json
{
  "booking_id": "bk1...",
  "success_url": "https://app.example.com/payment/success",
  "cancel_url": "https://app.example.com/payment/cancel"
}
```

**Response `201`:**
```json
{
  "payment_id": "pay1...",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_...",
  "amount_cents": 2500,
  "currency": "USD"
}
```

---

### GET /payments/{paymentId}

**Purpose:** Get payment status (client or admin).

**Response `200`:**
```json
{
  "id": "pay1...",
  "status": "succeeded",
  "amount_cents": 2500,
  "currency": "USD",
  "booking_id": "bk1...",
  "paid_at": "2026-06-24T12:00:00Z"
}
```

---

### GET /businesses/{businessId}/payments

**Purpose:** Admin payment list.

**Query:** `?status=succeeded&date_from=2026-06-01`

**Response `200`:** Paginated payments.

---

### GET /payments/checkout/verify

**Purpose:** Verify Stripe Checkout session after client redirect (`/payment/success?session_id=...`).

**Query:** `?session_id=cs_...`

**Response `200`:**
```json
{
  "payment_id": "pay1...",
  "status": "succeeded",
  "booking_id": "bk1...",
  "order_id": null
}
```

Returns `202` if webhook not yet processed (client may poll).

---

### POST /webhooks/stripe

**Purpose:** Stripe webhook (checkout.session.completed, payment_intent.succeeded, etc.).

**Request:** Raw Stripe event payload.

**Response `200`:** `{ "received": true }`

---

### POST /businesses/{businessId}/stripe/connect

**Purpose:** Start Stripe Connect onboarding.

**Response `200`:**
```json
{
  "onboarding_url": "https://connect.stripe.com/..."
}
```

---

### GET /businesses/{businessId}/stripe/status

**Purpose:** Check Connect account status.

**Response `200`:**
```json
{
  "connected": true,
  "charges_enabled": true,
  "payouts_enabled": true
}
```

---

## Schedule

### GET /public/b/{slug}/schedule

**Purpose:** Public working hours summary (optional, for display).

**Response `200`:**
```json
{
  "working_hours": [
    { "day_of_week": 1, "is_open": true, "opens_at": "09:00", "closes_at": "18:00" }
  ]
}
```

---

### GET /businesses/{businessId}/schedule

**Purpose:** Admin full schedule config.

**Response `200`:**
```json
{
  "working_hours": [...],
  "breaks": [
    { "id": "br1...", "label": "Lunch", "starts_at": "13:00", "ends_at": "14:00" }
  ],
  "unavailable_times": [
    { "id": "ut1...", "starts_at": "2026-07-01T00:00:00Z", "ends_at": "2026-07-07T23:59:59Z", "reason": "Vacation" }
  ],
  "settings": {
    "slot_interval_minutes": 30,
    "booking_buffer_minutes": 0
  }
}
```

---

### PUT /businesses/{businessId}/schedule/working-hours

**Purpose:** Replace all working hours.

**Request:**
```json
{
  "working_hours": [
    { "day_of_week": 0, "is_open": false },
    { "day_of_week": 1, "is_open": true, "opens_at": "09:00", "closes_at": "18:00" }
  ]
}
```

**Response `200`:** Updated schedule.

---

### POST /businesses/{businessId}/schedule/breaks

**Purpose:** Add break.

**Request:**
```json
{
  "label": "Lunch",
  "starts_at": "13:00",
  "ends_at": "14:00"
}
```

**Response `201`:** Created break.

---

### POST /businesses/{businessId}/schedule/unavailable-times

**Purpose:** Block date range.

**Request:**
```json
{
  "starts_at": "2026-07-01T00:00:00Z",
  "ends_at": "2026-07-07T23:59:59Z",
  "reason": "Vacation"
}
```

**Response `201`:** Created block.

---

### DELETE /businesses/{businessId}/schedule/breaks/{breakId}

**Purpose:** Remove break.

**Response `204`:** No body.

---

### DELETE /businesses/{businessId}/schedule/unavailable-times/{blockId}

**Purpose:** Remove unavailable block.

**Response `204`:** No body.

---

## Clients

### GET /businesses/{businessId}/clients

**Purpose:** Admin client list.

**Query:** `?search=carl&page=1`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "c1...",
      "full_name": "Carl Lee",
      "email": "carl@email.com",
      "phone": "+15550199",
      "bookings_count": 3,
      "orders_count": 0,
      "last_activity_at": "2026-06-25T14:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 48 }
}
```

---

### GET /businesses/{businessId}/clients/{clientId}

**Purpose:** Client profile with history.

**Response `200`:**
```json
{
  "id": "c1...",
  "full_name": "Carl Lee",
  "email": "carl@email.com",
  "phone": "+15550199",
  "notes": "Prefers morning slots",
  "bookings": [...],
  "orders": [...]
}
```

---

### PATCH /businesses/{businessId}/clients/{clientId}

**Purpose:** Update admin notes / contact.

**Request:**
```json
{
  "notes": "VIP client",
  "phone": "+15550199"
}
```

**Response `200`:** Updated client.

---

## Notifications

### GET /me/notifications

**Purpose:** User in-app notifications.

**Query:** `?unread_only=true`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "n1...",
      "event_type": "booking.confirmed",
      "title": "Booking confirmed",
      "body": "Haircut on Jun 25 at 14:30",
      "read_at": null,
      "created_at": "2026-06-24T12:00:00Z",
      "payload": { "booking_id": "bk1..." }
    }
  ],
  "meta": { "unread_count": 2 }
}
```

---

### POST /me/notifications/{notificationId}/read

**Purpose:** Mark notification read.

**Response `200`:** `{ "id": "n1...", "read_at": "..." }`

---

### GET /businesses/{businessId}/notification-settings

**Purpose:** Admin email notification toggles.

**Response `200`:**
```json
{
  "booking_created": true,
  "order_submitted": true,
  "order_message": true,
  "payment_succeeded": true
}
```

---

### PATCH /businesses/{businessId}/notification-settings

**Purpose:** Update toggles.

**Request:**
```json
{
  "booking_created": false,
  "order_submitted": true
}
```

**Response `200`:** Updated settings.

---

## Admin (Business Dashboard)

### GET /businesses/{businessId}/dashboard

**Purpose:** Summary stats for admin home.

**Response `200`:**
```json
{
  "today_bookings_count": 5,
  "pending_orders_count": 2,
  "revenue_mtd_cents": 124000,
  "new_clients_this_week": 3,
  "today_schedule": [
    {
      "booking_id": "bk1...",
      "starts_at": "2026-06-25T09:00:00-04:00",
      "service_name": "Haircut",
      "client_name": "Anna",
      "status": "confirmed"
    }
  ],
  "needs_attention": [
    { "type": "order", "id": "ord1...", "title": "Rush repair", "status": "submitted" }
  ],
  "usage": {
    "plan": "starter",
    "bookings_used": 180,
    "bookings_limit": 200
  }
}
```

---

## Superadmin

### GET /superadmin/businesses

**Purpose:** List all businesses.

**Query:** `?plan=free&status=active&search=joe`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "b2c3d4e5-...",
      "name": "Joe's Salon",
      "slug": "joes-salon",
      "plan": "starter",
      "status": "active",
      "owner_email": "maria@salon.com",
      "created_at": "2026-01-15T00:00:00Z",
      "bookings_this_month": 42
    }
  ],
  "meta": { "page": 1, "total": 156 }
}
```

---

### GET /superadmin/businesses/{businessId}

**Purpose:** Business detail for support.

**Response `200`:** Business + subscription + usage + recent audit logs.

---

### PATCH /superadmin/businesses/{businessId}

**Purpose:** Override plan or status.

**Request:**
```json
{
  "status": "suspended",
  "plan": "pro"
}
```

**Response `200`:** Updated business.

---

### GET /superadmin/subscriptions

**Purpose:** Platform subscription overview.

**Response `200`:**
```json
{
  "data": [
    {
      "business_id": "b2...",
      "business_name": "Joe's Salon",
      "plan": "starter",
      "status": "active",
      "current_period_end": "2026-07-01T00:00:00Z"
    }
  ],
  "summary": {
    "total_businesses": 156,
    "by_plan": { "free": 80, "starter": 50, "business": 20, "pro": 6 }
  }
}
```

---

### GET /superadmin/audit-logs

**Purpose:** Platform audit trail.

**Query:** `?business_id=b2...&action=business.suspended`

**Response `200`:** Paginated audit logs.

---

## Health

### GET /health

**Purpose:** Liveness check.

**Response `200`:** `{ "status": "ok" }`

---

## Rate Limits (Recommended)

| Route group | Limit |
|-------------|-------|
| Public catalog | 60/min/IP |
| Auth | 10/min/IP |
| Booking create | 5/min/IP per business |
| Admin | 120/min/user |

---

## Webhook Events (Internal, Future)

Post-MVP outbound webhooks for Pro plan:
- `booking.created`, `booking.cancelled`
- `order.submitted`, `order.completed`
- `payment.succeeded`
