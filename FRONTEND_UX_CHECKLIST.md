# Frontend UX Checklist

Manual review guide for desktop and mobile. Use after UI changes or before a release demo.

**Last polish pass:** Phase 4 Slice 19 — small desktop/mobile spacing and layout fixes. No backend or payment changes.

### Latest status (Post-Phase-4)

- **Mobile/desktop polish** — completed (Slice 19); responsive grids, auth/form shells, no horizontal scroll fixes.
- **Pricing** — static on platform landing `/` only; no Stripe, checkout, or plan detail pages.
- **Message notifications** — in-app dismissible banners while order message view is open; not browser push.
- **Deferred:** dedicated messenger inbox, unread counts, WebSocket — see [MVP_RELEASE_REPORT.md § Post-Phase-4 checkpoint](./MVP_RELEASE_REPORT.md#post-phase-4-checkpoint).

**Prerequisites:**

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed_demo.py
```

Open http://localhost:5173 (desktop) and http://YOUR-PC-IP:5173 (phone on same Wi‑Fi).

Demo credentials: `owner@example.com`, `client@example.com`, `superadmin@example.com` — password `ChangeMe123!`

---

## Desktop checklist (≥1024px)

### Global

- [ ] No horizontal scroll on any page
- [ ] Main content width feels balanced (not too narrow, not edge-to-edge)
- [ ] Nav links readable; long labels do not overlap
- [ ] Headings scale appropriately (`text-xl` mobile → `md:text-2xl` on key pages)
- [ ] Long titles and references wrap (`break-words`) instead of overflowing
- [ ] Buttons and CTAs align consistently within sections
- [ ] Empty states show clear title + short helper text

### Public

| Page | Check |
|------|-------|
| `/` | Hero, feature cards, pricing grid (4 columns), CTAs aligned |
| `/b/demo-business` | Business header, services link, no excess empty space |
| `/b/demo-business/services` | Service cards in 2–3 column grid on wide screens |
| `/b/demo-business/services/:id` | Detail readable; price and description wrap |
| `…/book` | Form centered (`max-w-2xl`); date/slot picker usable |
| `…/request` | Form centered; fields not stretched full viewport |

### Auth

| Page | Check |
|------|-------|
| `/login`, `/register` | Form centered (`max-w-md`); fields full width within card |
| `/forgot-password`, `/reset-password` | Same auth shell; helper text not duplicated |
| `/check-email`, `/verify-email` | Status message readable; resend/link actions clear |

### Client (`/me/*`)

| Page | Check |
|------|-------|
| `/me/bookings`, `/me/orders` | List cards in 2 columns on large screens |
| `/me/orders/:id` | Messages panel readable; send form full width |
| `/me/claim` | Toggle buttons + form centered; success card clear |

### Admin

| Page | Check |
|------|-------|
| `/admin` | Dashboard cards and quick links readable |
| `/admin/services` | Grid layout; create/edit forms usable |
| `/admin/bookings`, `/admin/orders`, `/admin/clients` | 2-column card grids on large screens |
| `/admin/schedule`, `/admin/settings` | Forms not overly wide |

### Superadmin

| Page | Check |
|------|-------|
| `/superadmin` | Overview stats and links |
| `/superadmin/businesses` | Table/cards readable |
| `/superadmin/audit-logs` | Log entries wrap; filters usable |

---

## Mobile checklist (≤430px)

### Global

- [ ] No horizontal scroll (check with DevTools device mode or real phone)
- [ ] Tap targets ≥44px where possible (buttons, nav links)
- [ ] Text readable without zooming
- [ ] Forms usable with on-screen keyboard (fields not hidden)
- [ ] Sticky/fixed nav does not cover content

### Public

- [ ] Landing pricing cards stack in one column
- [ ] Feature cards stack cleanly
- [ ] Service list single column
- [ ] Booking date picker and time slots tappable
- [ ] Order request textarea and submit button reachable

### Auth

- [ ] Login/register forms fit screen width with padding
- [ ] Password fields and show/hide (if any) work on mobile

### Client

- [ ] Booking/order cards full width
- [ ] Order messages: scroll area usable; send button easy to tap
- [ ] New message banner dismissible and not blocking input

### Admin / Superadmin

- [ ] Mobile nav hamburger opens/closes
- [ ] Admin tables/cards readable (no clipped text)
- [ ] Order detail panel messages usable on small screens
- [ ] Action buttons (confirm, accept, etc.) tappable

---

## Flow smoke tests

Run these end-to-end on both desktop and mobile once per release candidate.

### Public guest flow

1. Open `/b/demo-business/services`
2. Open a booking service → Book → pick date/slot → submit as guest
3. Open a request service → Request → submit as guest
4. Note reference for claim test

### Auth flow

1. Register new user → `/check-email`
2. Login as `client@example.com`
3. Logout → forgot password (UI only if SMTP off)

### Client flow

1. `/me/bookings` — list loads
2. `/me/orders` — open detail → send message → see auto-refresh hint
3. `/me/claim` — claim guest item (reference from admin or seed)

### Admin flow

1. Login as `owner@example.com`
2. `/admin/bookings` — confirm or view detail
3. `/admin/orders` — open order → reply to client message
4. `/admin/services` — list loads

### Superadmin flow

1. Login as `superadmin@example.com`
2. `/superadmin/businesses` — list and detail
3. `/superadmin/audit-logs` — entries visible

---

## Known limitations (UX)

| Item | Notes |
|------|-------|
| Order messages | Poll every 1s while page open; no dedicated inbox |
| New message alerts | In-app banner only; no browser push or unread badges |
| No real-time | WebSocket not implemented; slight delay vs instant chat |
| No payments | Pricing on `/` is informational; no checkout |
| Guest claim | Manual reference entry; no magic-link email |
| PWA offline | Manifest only; no service worker cache |
| Admin charts | Dashboard stats only; no graphs |
| Playwright | Smoke tests local/manual; not full visual regression |

---

## Recommended future improvements

Priority order for post-MVP budget:

1. **Dedicated messenger inbox** — conversation list, client search, thread view
2. **Unread badges** — counts on nav and order list
3. **WebSocket (later)** — replace or supplement polling for messages
4. **Stripe payments (later)** — checkout for deposits or full payment
5. **Mobile app wrapper (later)** — Capacitor/React Native after web UX is stable
6. **Visual regression** — optional Playwright screenshots in CI (lightweight)
7. **Dark mode** — only if brand requires it

---

## Slice 19 polish summary (what changed)

- `overflow-x-hidden` on `html`/`body` to prevent horizontal scroll
- Wider desktop container in public `Layout` (`lg:max-w-5xl`)
- `AuthPageShell` (`max-w-md`) for auth pages
- `FormPageShell` (`max-w-2xl`) for booking, request, claim, service detail forms
- Responsive grids for services, bookings, orders, clients lists
- Consistent section padding (`md:px-6 md:py-8`) on main layouts
- `break-words` on cards, empty states, and long titles

**Not changed:** backend logic, Stripe, OAuth, WebSocket, service worker, mobile wrapper, full redesign.

---

## Manual review log (template)

| Date | Device | Tester | Result | Notes |
|------|--------|--------|--------|-------|
| 2026-06-26 | Desktop Chrome | Agent | Pass | Landing, services grid, admin/superadmin layouts — no horizontal scroll |
| 2026-06-26 | Mobile (simulated 390px) | Agent | Pass | Pricing stacks, forms centered, nav scrolls horizontally if needed |

Update this table after each manual QA session.
