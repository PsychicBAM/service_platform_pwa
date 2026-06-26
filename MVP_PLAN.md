# Service Platform PWA — MVP Implementation Plan

Phased delivery plan from documentation to production MVP.  
**Prerequisite:** All planning docs complete (this repository phase).

---

## Overview Timeline

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
 Backend     Client       Admin        Payments    Notifications  Wrapper
 skeleton    PWA          PWA
 (~2 wk)     (~3 wk)      (~3 wk)      (~2 wk)     (~1 wk)       (~1 wk)
```

Total estimate: **12–14 weeks** for a small team (1 backend + 1 frontend). Phases 4–5 can partially overlap with Phase 3.

---

## Phase 1: Backend Skeleton

### Goal

Establish API foundation, database, auth, and core CRUD with no payment or notification integrations yet.

### Deliverables

| # | Deliverable |
|---|-------------|
| 1.1 | Monorepo or split repo structure (`/api`, `/web` placeholder) |
| 1.2 | PostgreSQL schema migrations for all entities in `DATA_MODEL_DRAFT.md` |
| 1.3 | Auth: register, login, refresh, logout, `/auth/me` |
| 1.4 | Business CRUD + public `/public/b/{slug}` |
| 1.5 | Services CRUD with booking/order type enforcement |
| 1.6 | Schedule CRUD (working hours, breaks, unavailable times) |
| 1.7 | Slot availability engine (`GET .../availability`) |
| 1.8 | Bookings CRUD + overlap prevention (transactional) |
| 1.9 | Orders CRUD + order messages |
| 1.10 | Clients auto-create on booking/order |
| 1.11 | Plan limit middleware (hard checks on Free/Starter) |
| 1.12 | Superadmin routes (business list, suspend, plan override) |
| 1.13 | Audit logging for superadmin actions |
| 1.14 | OpenAPI/Swagger spec generated from routes |
| 1.15 | Docker Compose for local dev (API + Postgres) |
| 1.16 | Seed script: demo business with services + schedule |

### Tests

| Area | Test type |
|------|-----------|
| Auth | Unit: password hash, JWT issue/verify |
| Auth | Integration: register → login → refresh |
| Bookings | Unit: slot generation from schedule |
| Bookings | Integration: concurrent double-book attempt → one fails |
| Orders | Integration: full lifecycle submitted → completed |
| Plan limits | Unit: enforce service count on free plan |
| Tenant isolation | Integration: admin A cannot read business B data |
| Schedule | Unit: breaks and unavailable blocks exclude slots |

**Target coverage:** ≥ 70% on business logic services; 100% on slot overlap and auth guards.

### Manual Checks

- [ ] Register business owner → business created with Free subscription
- [ ] Create booking and order services; verify type cannot change
- [ ] Set Mon–Fri 9–18, lunch break → slots exclude 13:00–14:00
- [ ] Add vacation block → no slots on those dates
- [ ] Create booking via API → reference number generated
- [ ] Two simultaneous bookings for same slot → second returns `SLOT_UNAVAILABLE`
- [ ] Superadmin suspends business → public endpoint returns 403
- [ ] Swagger UI loads and matches `API_DRAFT.md` paths

### Risks

| Risk | Mitigation |
|------|------------|
| Timezone bugs in slot engine | Store UTC; convert with business timezone; test DST edge cases |
| Race on booking create | DB unique constraint on (business_id, starts_at) + transaction |
| Scope creep into payments | Strict phase gate — no Stripe in Phase 1 |
| ORM migration drift | Single migration source; CI runs migrations on ephemeral DB |

### Exit Criteria

API implements all non-payment, non-notification endpoints from `API_DRAFT.md` with passing tests and seed data.

---

## Phase 2: Client PWA

### Goal

Mobile-first client experience: browse services, book appointments, submit orders, view history.

### Deliverables

| # | Deliverable |
|---|-------------|
| 2.1 | Vite + React + TypeScript + Tailwind project |
| 2.2 | PWA manifest + service worker (app shell cache) |
| 2.3 | Routing: `/b/:slug`, booking flow, order flow, auth |
| 2.4 | Home page (mode-aware CTAs) — wireframe MC1 |
| 2.5 | Services list + service detail cards — MC2–MC4 |
| 2.6 | Booking flow: date → time → confirm — MC5–MC7 |
| 2.7 | Order flow: form → submit — MC8 |
| 2.8 | Auth pages: login, register (client + link to business signup) |
| 2.9 | My bookings list + detail + cancel/reschedule — MC9 |
| 2.10 | My orders list + detail — MC10 |
| 2.11 | Order chat UI — MC11 |
| 2.12 | API client layer with token refresh |
| 2.13 | Error states, empty states, loading skeletons |
| 2.14 | Guest checkout path (contact form at confirm) |
| 2.15 | Responsive 375px–768px; basic tablet layout |

### Tests

| Area | Test type |
|------|-----------|
| Components | Unit: ServiceCard renders booking vs order variants |
| Booking flow | Integration (RTL): date select → slots load → confirm |
| Auth | Integration: token stored, refresh on 401 |
| Routing | Unit: mode=orders_only hides booking nav |
| PWA | Manual: Lighthouse PWA audit ≥ 90 |

### Manual Checks

- [ ] Open `/b/joes-salon` on phone viewport — home renders correctly
- [ ] Complete booking flow end-to-end against Phase 1 API
- [ ] Complete order flow with form data persisted
- [ ] Cancel booking within policy window works
- [ ] Reschedule updates slot on server
- [ ] Order chat sends and displays messages (polling 5s MVP)
- [ ] Guest user can book without account
- [ ] Offline: app shell loads with offline banner on API fail
- [ ] Install PWA on Android Chrome + iOS Safari Add to Home Screen

### Risks

| Risk | Mitigation |
|------|------------|
| iOS PWA limitations | Document known limits; test Add to Home Screen early |
| Slot UI stale data | Revalidate slots on confirm submit |
| Long booking flow drop-off | Persist draft in sessionStorage |

### Exit Criteria

All client flows C1–C4, C6–C9 from `USER_FLOWS.md` functional against live API (payment step stubbed).

---

## Phase 3: Admin PWA

### Goal

Business admin dashboard on mobile and desktop to operate bookings, orders, services, clients, schedule.

### Deliverables

| # | Deliverable |
|---|-------------|
| 3.1 | Admin route group `/admin/:businessId/...` with auth guard |
| 3.2 | Admin layout: mobile bottom nav + desktop sidebar — MA1, DA1 |
| 3.3 | Dashboard with stats + today schedule + needs attention |
| 3.4 | Bookings list + detail + actions — MA2, DA3 |
| 3.5 | Orders list + accept/decline + messaging — MA3, DA4 |
| 3.6 | Services CRUD — MA4, DA2 |
| 3.7 | Clients list + profile — MA5, DA5 |
| 3.8 | Schedule editor — DA7 |
| 3.9 | Settings pages — MA7, DA8 |
| 3.10 | Manual booking creation form |
| 3.11 | Plan usage banner + upgrade CTA |
| 3.12 | Desktop breakpoints ≥ 1024px for tables |

### Tests

| Area | Test type |
|------|-----------|
| Auth guard | Integration: non-member redirected |
| Dashboard | Integration: stats match API fixture |
| Services | Unit: booking service requires duration |
| Orders | Integration: accept → status in_progress |
| Schedule | Integration: save hours → availability changes |

### Manual Checks

- [ ] Admin login → lands on dashboard with today's bookings
- [ ] Confirm pending booking from list
- [ ] Accept and decline order with reason
- [ ] Reply to order message; client sees it in Phase 2 app
- [ ] Create/edit/deactivate service
- [ ] Edit working hours → client slot picker reflects changes
- [ ] Add vacation → slots disappear for those dates
- [ ] Desktop: all tables sortable and paginated
- [ ] Mobile: card lists usable one-handed
- [ ] Non-admin user gets 403 on admin routes

### Risks

| Risk | Mitigation |
|------|------------|
| Admin UX complexity on mobile | Prioritize dashboard + bookings + orders; defer payments to Phase 4 |
| Table performance | Server-side pagination from day one |
| Multi-business owners | Business switcher in header |

### Exit Criteria

All admin flows A1–A8 from `USER_FLOWS.md` functional. Superadmin UI optional minimal (can use API/Swagger until polished).

---

## Phase 4: Payments

### Goal

Stripe Checkout integration for bookings and orders; Connect onboarding for businesses.

### Deliverables

| # | Deliverable |
|---|-------------|
| 4.1 | Stripe Connect Express onboarding flow |
| 4.2 | `POST /payments/checkout` → Checkout Session |
| 4.3 | Webhook handler with idempotency keys |
| 4.4 | Booking status: `pending_payment` → `confirmed` on success |
| 4.5 | Client payment redirect + success/cancel pages |
| 4.6 | Admin payments list — MA6, DA6 |
| 4.7 | Platform fee calculation by plan (Starter 5%, Business 2%) |
| 4.8 | Subscription billing for platform plans (Stripe Billing) |
| 4.9 | Upgrade flow: Free → Starter → Business |
| 4.10 | Payment-required enforcement on services |

### Tests

| Area | Test type |
|------|-----------|
| Webhooks | Integration: Stripe CLI fixture events |
| Idempotency | Unit: duplicate webhook ignored |
| Checkout | Integration: session metadata links to booking |
| Plan gate | Unit: Free plan cannot create checkout |
| Fees | Unit: correct application_fee per plan |

### Manual Checks

- [ ] Business completes Stripe Connect onboarding (test mode)
- [ ] Client pays for booking → status confirmed + payment succeeded
- [ ] Abandon checkout → booking released after timeout
- [ ] Admin sees payment in list with Stripe link
- [ ] Upgrade subscription → limits increase immediately
- [ ] Webhook retry does not double-charge or duplicate status

### Risks

| Risk | Mitigation |
|------|------------|
| Webhook delivery failures | Idempotency table; retry-safe handlers |
| Connect onboarding drop-off | Clear settings UI with status indicator |
| PCI scope | Never touch card data — Checkout only |
| Currency mismatch | USD only MVP |

### Exit Criteria

Flow C5 complete. Revenue path verified in Stripe test mode end-to-end.

---

## Phase 5: Notifications

### Goal

Email notifications for core events; in-app notification center; PWA push (stretch).

### Deliverables

| # | Deliverable |
|---|-------------|
| 5.1 | Email provider integration (Resend/SendGrid) |
| 5.2 | Notification service: queue + templates |
| 5.3 | Events: booking created/confirmed/reminder/cancelled |
| 5.4 | Events: order submitted/accepted/declined/completed |
| 5.5 | Events: new order message, payment receipt |
| 5.6 | Admin notification preference toggles |
| 5.7 | In-app notification list + mark read |
| 5.8 | Booking reminder cron (24h before) |
| 5.9 | (Stretch) Web Push via service worker |

### Tests

| Area | Test type |
|------|-----------|
| Templates | Unit: correct variables rendered |
| Triggers | Integration: booking create → email queued |
| Preferences | Unit: disabled event skips send |
| Reminder cron | Integration: picks bookings in 24h window |
| Idempotency | Unit: no duplicate reminder emails |

### Manual Checks

- [ ] Client receives confirmation email after booking
- [ ] Admin receives email on new order
- [ ] Client receives decline reason email
- [ ] Reminder email sent 24h before (adjust cron for test)
- [ ] Disable toggle → no email for that event
- [ ] In-app bell shows unread count
- [ ] (Stretch) Push notification on Android PWA

### Risks

| Risk | Mitigation |
|------|------------|
| Email deliverability | Verified domain; SPF/DKIM setup checklist |
| Cron missed runs | Use reliable scheduler (e.g. pg_cron, BullMQ) |
| Push iOS limits | Document as best-effort; email is primary |
| Notification spam | Batch admin digest post-MVP if noisy |

### Exit Criteria

Flow C10 complete for email. All events in `PRODUCT_SPEC.md` notifications table implemented.

---

## Phase 6: Mobile App Wrapper

### Goal

Optional native shell for app store presence; deep links; improved push.

### Deliverables

| # | Deliverable |
|---|-------------|
| 6.1 | Capacitor (or TWA) wrapper loading PWA URL |
| 6.2 | App icons + splash screens |
| 6.3 | Deep links: `serviceplatform://b/{slug}` |
| 6.4 | Native push registration (FCM/APNs) bridged to notification service |
| 6.5 | Biometric app lock (optional stretch) |
| 6.6 | App Store + Play Store metadata and screenshots |
| 6.7 | CI build pipeline for iOS + Android |

### Tests

| Area | Test type |
|------|-----------|
| Deep links | Manual: link opens correct business |
| Push | Manual: native push received on device |
| Build | CI: APK/AAB builds successfully |

### Manual Checks

- [ ] Install from TestFlight / Internal testing track
- [ ] Deep link opens booking page
- [ ] Push notification tap navigates to order
- [ ] PWA and wrapper share same auth session (cookie/token strategy)
- [ ] Offline shell behavior matches browser PWA

### Risks

| Risk | Mitigation |
|------|------------|
| App store rejection | Follow WebView guidelines; no hidden features |
| Push certificate complexity | Use Capacitor push plugin; document setup |
| Maintenance burden | Wrapper thin — all logic stays in PWA |
| iOS WebView cookie issues | Token in secure storage bridge |

### Exit Criteria

Apps published to internal testing tracks; deep links and push verified on physical devices.

---

## Cross-Phase Concerns

### CI/CD (Start Phase 1)

- Lint + test on every PR
- Preview deploy for frontend (Vercel/Netlify)
- Staging API environment with test Stripe keys
- Database migrations run automatically on deploy

### Security Checklist (Before Production)

- [ ] OWASP top 10 review
- [ ] Rate limiting on auth and booking endpoints
- [ ] CORS restricted to known origins
- [ ] Secrets in env vars, not repo
- [ ] Tenant isolation penetration test
- [ ] Stripe webhook signature verification

### Documentation Handoff

| Phase | Update docs |
|-------|-------------|
| 1 | OpenAPI spec becomes source of truth alongside `API_DRAFT.md` |
| 2–3 | Component storybook (optional) |
| 4 | Stripe setup runbook |
| 5 | Email template catalog |
| 6 | App store release runbook |

### MVP Launch Checklist

- [ ] All Phase 1–5 exit criteria met
- [ ] Production Stripe + email domain verified
- [ ] Error monitoring (Sentry) live
- [ ] Analytics baseline (privacy-friendly)
- [ ] Privacy policy + terms of service pages
- [ ] Onboarding guide for first business
- [ ] Superadmin can operate platform without SQL

---

## Deferred Post-MVP Roadmap (Reference)

| Version | Features |
|---------|----------|
| v1.1 | Refund UI, file uploads, per-staff calendars, i18n |
| v1.2 | Custom domains, calendar sync, analytics dashboard |
| v1.3 | SMS, waitlist, reviews |
| v2.0 | API webhooks, marketing automation, multi-location |

---

## Team & Ownership Suggestion

| Phase | Primary owner |
|-------|---------------|
| 1 | Backend engineer |
| 2 | Frontend engineer |
| 3 | Frontend engineer |
| 4 | Backend + frontend pair |
| 5 | Backend engineer |
| 6 | Mobile/DevOps |

**Parallelization:** Frontend can start Phase 2 against Phase 1 API in week 2 using seed data and mock payment stubs.
