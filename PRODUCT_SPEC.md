# Service Platform PWA — Product Specification

## 1. Product Idea

**Service Platform** is a multi-tenant SaaS Progressive Web App (PWA) that lets small and medium businesses offer two distinct ways for clients to engage:

1. **Appointment bookings** — clients pick a date and time for time-bound services (haircuts, consultations, repairs with a scheduled visit).
2. **Service orders/requests** — clients submit open-ended requests without choosing a slot (custom quotes, delivery orders, repair tickets, document requests).

Each business operates in its own branded space. The platform provides scheduling, order workflow, client management, payments, and notifications in one mobile-first experience.

**Inspired by** universal booking bot patterns (service catalog → choose type → collect details → confirm → notify), but redesigned as a standalone SaaS product with web admin, not a Telegram bot.

### Core Value Proposition

| Stakeholder | Value |
|-------------|-------|
| **Business owner** | One tool for bookings + orders, no custom dev |
| **Client** | Book or request from phone in under 2 minutes |
| **Platform** | Recurring subscription revenue per business |

### Operating Modes

Each business configures one of three modes:

| Mode | Bookings | Orders |
|------|----------|--------|
| `booking_only` | ✓ | ✗ |
| `orders_only` | ✗ | ✓ |
| `both` | ✓ | ✓ |

Services are explicitly tagged as `booking` or `order` type — never both on the same service record.

---

## 2. Target Users

### Primary

- **Solo professionals** — barbers, tutors, therapists, photographers
- **Small service teams** — salons, clinics, repair shops (2–15 staff)
- **Local businesses** — dry cleaning, tailoring, catering with quote-based orders

### Secondary

- **Franchise operators** — multiple locations under one brand (post-MVP)
- **Platform operators** — internal team managing tenants and billing

### User Personas

**Maria — Salon Owner (Admin)**
- Needs online booking for cuts/color and order requests for custom wig orders
- Checks phone between clients; wants push notifications for new bookings
- Uses admin dashboard on tablet at reception

**Alex — Client**
- Discovers business via link/QR code
- Books a haircut on mobile; later submits a custom order without a date
- Expects SMS/email reminders and ability to reschedule

**Platform Ops — Superadmin**
- Onboards businesses, handles billing disputes, disables abusive accounts

---

## 3. Roles

### 3.1 Client

- Registers or books as guest (business-configurable)
- Browses services for a specific business
- Creates bookings (date/time) or orders (no date/time)
- Pays online when required
- Views own bookings and orders
- Messages business on an order thread
- Cancels or reschedules bookings (within business rules)
- Receives notifications

**Access scope:** Own data only, within one business context per session (can belong to multiple businesses as separate client records).

### 3.2 Business Owner / Admin

- Full control over their business tenant
- Manages services, schedule, bookings, orders, clients
- Accepts/declines orders, updates statuses
- Views payments (refunds via Stripe dashboard in MVP; refund UI post-MVP)
- Configures business settings, notifications, operating mode
- Invites staff members (Business plan+)

**Access scope:** Single business (or multiple if owner of several — separate tenants).

### 3.3 Platform Superadmin

- Manages all businesses on the platform
- Manages subscription plans and overrides
- Enables/disables business accounts
- Views platform-wide audit logs and metrics
- Cannot access client PII beyond what is needed for support (logged)

**Access scope:** Global platform.

---

## 4. Modules

### 4.1 Booking Module

**Purpose:** Time-slot-based appointment scheduling.

**Capabilities:**
- Service catalog filtered to `type: booking`
- Calendar date picker respecting working hours, breaks, unavailable blocks
- Time slot generation based on service duration + buffer
- Booking lifecycle: `pending` / `pending_payment` → `confirmed` → `completed` / `cancelled` / `no_show`
- Client self-service cancel/reschedule within policy window
- Admin manual create/edit/cancel bookings
- Optional deposit or full prepayment at booking time

**Key rules:**
- No double-booking of same staff/resource slot
- Minimum advance booking time (e.g. 2 hours)
- Maximum advance booking window (e.g. 60 days)
- Cancellation cutoff (e.g. 24h before)

### 4.2 Orders Module

**Purpose:** Asynchronous service requests without scheduled time.

**Capabilities:**
- Service catalog filtered to `type: order`
- Custom fields per service (text, number, select, file upload post-MVP)
- Order lifecycle: `submitted` / `pending_payment` → `accepted` / `declined` → `in_progress` → `completed` / `cancelled`
- Threaded messaging between client and admin per order
- Optional quoted price before payment
- Admin can convert accepted order to booking (post-MVP)

**Key rules:**
- Orders do not consume calendar slots
- Decline requires optional reason shown to client
- Message thread tied 1:1 to order

### 4.3 Payments Module

**Purpose:** Collect money for bookings and orders.

**Capabilities:**
- Integration-ready design (Stripe as primary target)
- Payment types: `deposit`, `full`, `balance`, `refund`
- Link payment to booking or order
- Payment status: `pending`, `processing`, `succeeded`, `failed`, `refunded`, `partially_refunded`
- Admin payment list with filters
- Client payment history

**MVP:** Stripe Checkout session creation + webhook status sync. No in-app card form.

### 4.4 Clients Module

**Purpose:** CRM-lite for business admins.

**Capabilities:**
- Auto-create client record on first booking/order
- Client profile: name, phone, email, notes (admin-only)
- Client history: all bookings and orders
- Tags/segments (post-MVP)
- Export CSV (Business plan+)

### 4.5 Notifications Module

**Purpose:** Keep clients and admins informed.

**Channels (phased):**
- Email (MVP)
- Push (PWA, Phase 5)
- SMS (post-MVP / add-on)

**Events:**
| Event | Client | Admin |
|-------|--------|-------|
| Booking created | ✓ | ✓ |
| Booking confirmed | ✓ | — |
| Booking reminder (24h) | ✓ | — |
| Booking cancelled/rescheduled | ✓ | ✓ |
| Order submitted | — | ✓ |
| Order accepted/declined | ✓ | — |
| New order message | ✓ | ✓ |
| Payment succeeded/failed | ✓ | ✓ |

### 4.6 Admin Dashboard Module

**Purpose:** Business operations hub.

**Capabilities:**
- Today's bookings and pending orders at a glance
- Quick actions: confirm, decline, message
- Services CRUD
- Schedule editor (working hours, breaks, time off)
- Settings: branding, mode, policies, notification prefs
- Team members (plan-gated)

---

## 5. Monetization Model

Subscription per business. Billed monthly. Annual discount (post-MVP).

| Feature | Free | Starter | Business | Pro |
|---------|------|---------|----------|-----|
| **Price** | $0 | $19/mo | $49/mo | $99/mo |
| **Mode** | booking OR orders | both | both | both |
| **Services** | 3 | 10 | unlimited | unlimited |
| **Bookings/month** | 30 | 200 | unlimited | unlimited |
| **Orders/month** | 10 | 50 | unlimited | unlimited |
| **Staff accounts** | 1 | 1 | 5 | unlimited |
| **Clients** | 50 | 500 | unlimited | unlimited |
| **Payments** | ✗ | ✓ (5% platform fee) | ✓ (2% fee) | ✓ (0% fee) |
| **Email notifications** | ✓ | ✓ | ✓ | ✓ |
| **Push notifications** | ✗ | ✓ | ✓ | ✓ |
| **Custom branding** | ✗ | logo only | logo + colors | white-label domain |
| **CSV export** | ✗ | ✗ | ✓ | ✓ |
| **API access** | ✗ | ✗ | ✗ | ✓ |
| **Support** | community | email | priority | dedicated |

**Free tier intent:** Let businesses try one mode with tight limits. Upgrade prompt when limits hit.

**Platform payment fee:** Applied on Starter/Business when using platform Stripe Connect (optional bring-your-own-keys on Pro).

---

## 6. MVP Scope

### In MVP

- [ ] Multi-tenant businesses with slug-based public URL (`/b/{slug}`)
- [ ] User auth: email + password; magic link (optional stretch)
- [ ] Roles: client, business admin, superadmin
- [ ] Business operating modes: `booking_only`, `orders_only`, `both`
- [ ] Services CRUD with `booking` vs `order` type
- [ ] Booking flow: date picker → time slots → confirm → optional pay
- [ ] Order flow: form → submit → admin accept/decline
- [ ] Order messaging (text only)
- [ ] Working hours + unavailable times (no per-staff scheduling)
- [ ] Client "My bookings" and "My requests" pages
- [ ] Admin dashboard (mobile + desktop responsive)
- [ ] Admin: bookings, orders, services, clients, schedule, settings
- [ ] Stripe Checkout for booking/order payments
- [ ] Email notifications (core events)
- [ ] Superadmin: list businesses, enable/disable, assign plan
- [ ] PWA: installable, offline shell (cached assets), online-required for API
- [ ] Subscription plan enforcement (hard limits on Free/Starter)

### Success Metrics (MVP)

- Client completes booking in &lt; 90 seconds
- Admin processes new order in &lt; 30 seconds
- Zero double-bookings under concurrent requests
- Payment webhook idempotency verified

---

## 7. Not Included in MVP

| Item | Rationale | Target |
|------|-----------|--------|
| Native iOS/Android apps | PWA first | Phase 6 wrapper |
| SMS notifications | Cost + compliance | Post-MVP add-on |
| Per-staff/resource calendars | Complexity | v1.1 |
| Recurring/repeating bookings | Complexity | v1.2 |
| File uploads on orders | Storage + AV | v1.1 |
| In-app card entry (Stripe Elements) | Checkout sufficient | v1.1 |
| Multi-location per business | Data model prep only | v1.2 |
| Custom domains | DNS + SSL automation | Pro phase 2 |
| Google/Apple calendar sync | OAuth scope | v1.2 |
| Waitlist / overbooking | Niche | v1.3 |
| Loyalty / packages | Monetization v2 | v2.0 |
| Reviews & ratings | Not core workflow | v1.3 |
| Inventory management | Different product | Out of scope |
| Telegram/WhatsApp bot | Separate product | Never copy |
| Automated marketing emails | CRM expansion | v2.0 |
| Multi-language UI | English only MVP | v1.1 |
| Role granularity (receptionist vs owner) | Single admin role MVP | v1.1 |
| Order → booking conversion | Manual workaround | v1.1 |
| Refund UI (admin) | Stripe dashboard | v1.1 |
| Analytics dashboard | Basic counts in MVP | v1.2 |
| Webhook API for third parties | Pro preview | v1.2 |

---

## 8. Technical Direction (Planning Only)

| Layer | Choice (recommended) |
|-------|---------------------|
| Frontend | React + Vite PWA, Tailwind CSS |
| Backend | Node.js (Fastify or Express) or Python (FastAPI) — TBD in Phase 1 |
| Database | PostgreSQL |
| Auth | JWT + refresh tokens; httpOnly cookies |
| Payments | Stripe Checkout + Connect |
| Email | Resend or SendGrid |
| Hosting | Vercel (frontend) + Railway/Fly (API) |

*No code in this phase — decisions documented for implementation teams.*

---

## 9. Design Principles

1. **Mobile-first** — Design client flows for 375px width; admin usable on phone.
2. **Simple UI** — Minimal steps; one primary action per screen.
3. **Mode-aware** — Hide booking or order UI based on business mode.
4. **Service type separation** — Booking services and order services are distinct entities in UX and data.
5. **Thin MVP** — Ship core loop; defer nice-to-haves per section 7.
6. **Tenant isolation** — All data scoped by `business_id`; no cross-tenant leaks.
7. **Optimistic UX, pessimistic payments** — Show instant UI feedback; confirm payment server-side only.
8. **Accessible** — WCAG 2.1 AA targets for forms and contrast.

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Booking** | Time-bound appointment tied to a calendar slot (entity/API name; UI may say "appointment") |
| **Order** | Async service request without scheduled time (entity/API name; UI may say "request") |
| **Service** | Something a business offers; either `booking` or `order` type |
| **Client** | End customer of a business (may or may not have login); always **client**, never "customer" in code |
| **Business** | A tenant account on the platform (`businesses` table); **tenant** is an alias in architecture docs |
| **Slot** | Available time window for a booking service |
| **price_type** | Service pricing mode: `fixed`, `free`, or `quote` (not `price_mode`) |
| **operating_mode** | Business mode: `booking_only`, `orders_only`, or `both` |
