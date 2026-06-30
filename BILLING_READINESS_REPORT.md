# Billing Readiness Report — Phase 5 (Slices 4–9)

**Purpose:** Document current manual/demo billing behavior and define what must be built before Stripe integration.  
**Status:** Billing backend + admin checkout UI + success/cancel pages exist. **Checkout session + webhook (Slice 6–7)** update `Subscription.plan` only via `checkout.session.completed` when `STRIPE_ENABLED=true`. Success page does not verify payment or change plan directly.

Related docs: [MVP_RELEASE_REPORT.md](./MVP_RELEASE_REPORT.md) · [README_BACKEND.md](./README_BACKEND.md) · [README_FRONTEND.md](./README_FRONTEND.md) · [FRONTEND_UX_CHECKLIST.md](./FRONTEND_UX_CHECKLIST.md) · [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) · [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md)

### Slice 5 — Stripe config validation (no payments)

- Settings: `STRIPE_ENABLED`, secret/webhook keys, price IDs (`starter`/`business`/`pro`), success/cancel URLs
- `scripts/check_production_env.py --strict` enforces Stripe fields only when `STRIPE_ENABLED=true`
- `api/app/services/stripe_config.py` maps plans to price env vars (no Stripe SDK calls in helper)

### Slice 6 — Backend checkout session (no plan change on create)

- `POST /api/v1/businesses/{business_id}/billing/checkout-session` — auth + business admin required
- Returns `checkout_url` and `session_id` when `STRIPE_ENABLED=true` and price IDs configured
- Mocked Stripe in tests only; **does not** change `Subscription.plan` (webhook does)

### Slice 7 — Stripe webhook backend

- `POST /api/v1/billing/stripe/webhook` — no Bearer auth; Stripe signature verification
- Handles `checkout.session.completed` → updates `Subscription.plan` + audit log (`change_source: stripe_webhook`)
- Idempotent by `stripe_event_id`; unsupported events ignored safely

### Slice 8 — Admin checkout buttons (frontend)

- **Admin → Settings** — paid-plan checkout buttons call checkout-session API
- Success → redirect to Stripe `checkout_url`; `STRIPE_DISABLED` → friendly manual billing message
- Public pricing still uses register links only; webhook activates plan after payment

### Slice 9 — Billing success/cancel pages (frontend)

- `/billing/success` — default `STRIPE_SUCCESS_URL`; explains webhook activation; optional `session_id` display
- `/billing/cancel` — default `STRIPE_CANCEL_URL`; no payment, no plan change
- No backend payment verification on success page; no billing portal

---

## A. Current billing status

| Area | Current behavior |
|------|------------------|
| **Pricing in frontend** | Landing `/` shows Free, Starter, Business, Pro with prices ($0 / $19 / $49 / $99), expandable details, and **Choose plan** links to `/register?plan=<id>`. Data: `web/src/data/pricingPlans.ts`. |
| **Signup plan intent** | Register sends `selected_plan_intent` to `POST /api/v1/auth/register`. Backend stores it in `business.settings` with `selected_plan_intent_source: "registration"` and `selected_plan_intent_recorded_at`. |
| **Active subscription on signup** | `Subscription.plan` is always created as **`free`**. `selected_plan_intent` does **not** activate a paid plan. |
| **Superadmin plan control** | Superadmin can manually set active plan on `/superadmin/businesses` (detail panel: **Set active plan manually** → **Save manual plan change**). |
| **Intent vs active plan** | Superadmin list/detail show **Active plan** and **Signup intent**. If they differ, UI shows a subtle **Plan request** badge and mismatch note. |
| **Audit logs** | Manual plan changes write `subscription.plan_changed` with `old_plan`, `new_plan`, `change_source: superadmin_manual`, and `selected_plan_intent` metadata when present. No log when plan unchanged. |
| **Payments** | Checkout session API + webhook (Slices 6–7) when `STRIPE_ENABLED=true`. Admin checkout (Slice 8). Success/cancel pages (Slice 9). Default off locally. |

**Important:** `selected_plan_intent` is a **signup preference record**, not an active paid subscription.

---

## B. Plan table

Source of truth for displayed copy: `web/src/data/pricingPlans.ts` and [PRODUCT_SPEC.md §5](./PRODUCT_SPEC.md#5-monetization-model).  
Backend enum: `app.models.enums.SubscriptionPlan` (`free`, `starter`, `business`, `pro`).

| Plan | Frontend price | Intended customer | Key limits / features | `SubscriptionPlan` enum | Stripe price ID |
|------|----------------|-------------------|------------------------|-------------------------|-----------------|
| **Free** | $0/mo | Testing and very small businesses | One mode (booking **or** orders); up to 3 services; 30 bookings / 10 orders per month; 1 staff; 50 clients; no online payments | `free` | **No** |
| **Starter** | $19/mo | Solo professionals | Both booking + request flows; up to 10 services; 200 bookings / 50 orders per month; 1 staff; 500 clients; email + push (when enabled); online payments planned (5% platform fee — future) | `starter` | **No** |
| **Business** | $49/mo | Growing businesses | Unlimited services, bookings, orders; up to 5 staff; unlimited clients; team/admin workflows; custom branding; CSV export; priority email support; online payments planned (2% fee — future) | `business` | **No** |
| **Pro** | $99/mo | Serious operations | Unlimited staff/clients; white-label domain (future); API access; dedicated support; bring-your-own payment keys (future); 0% platform fee (future) | `pro` | **No** |

**Note:** Plan limit enforcement in the backend is partial (e.g. free-tier service count). Full subscription enforcement is a separate slice; Stripe does not change that requirement.

---

## C. Current registration behavior

1. User clicks **Choose plan** on landing → `/register?plan=business` (or `free`, `starter`, `pro`).
2. Register page reads `?plan=` and pre-selects the plan radio (`parsePricingPlanId` in `pricingPlans.ts`).
3. On submit, frontend sends `selected_plan_intent` in the register payload.
4. Backend (`auth_service.py`) writes to `business.settings`:
   - `selected_plan_intent` — enum value string
   - `selected_plan_intent_source` — `"registration"`
   - `selected_plan_intent_recorded_at` — ISO timestamp
5. Backend creates `Subscription` with `plan=free`, `status=active`.
6. Superadmin can see requested plan on list/detail; active plan remains Free until manual change or future Stripe webhook sync.

User-facing notes on register:
- *“Selected plan is saved as your signup intent. Your account still starts on the Free plan until billing is implemented.”*
- *“Payments and automatic upgrades are not live yet. Plan changes are currently demo/manual.”*

---

## D. Manual superadmin workflow

Use after `seed_demo.py` or registering a test business with `?plan=business`.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Login as `superadmin@example.com` / `ChangeMe123!` | Superadmin session |
| 2 | Open `/superadmin/businesses` | Business cards list with **Active plan** |
| 3 | Open a business detail | **Subscription** section: active plan + status; **Signup plan intent** if recorded |
| 4 | Compare intent vs active | If different: amber note + **Plan request** badge on list |
| 5 | **Set active plan manually** → choose plan → **Save manual plan change** | `Subscription.plan` updates; intent in settings unchanged |
| 6 | Open `/superadmin/audit-logs` | `subscription.plan_changed` with `old_plan`, `new_plan`, `change_source: superadmin_manual`, intent metadata if present |
| 7 | Save same plan again | No duplicate plan-change audit log |

Demo seed business uses `Subscription.plan=business` without signup intent — use `/register?plan=business` to exercise intent mismatch UI.

---

## E. Stripe readiness checklist (not implemented)

Before going live with payments, implement and test:

- [ ] **Environment variables** — ✅ Slice 5 config + `check_production_env.py`
- [ ] **Checkout session endpoint** — ✅ Slice 6
- [ ] **Webhook endpoint** — ✅ Slice 7 `POST /api/v1/billing/stripe/webhook`; `checkout.session.completed` only
- [ ] **Idempotency** — ✅ `stripe_event_id` in audit metadata; duplicate events skipped
- [ ] **Audit logs for Stripe events** — ✅ `subscription.plan_changed` with `change_source: stripe_webhook`
- [ ] **Frontend checkout button** — ✅ Slice 8 Admin Settings (paid plans only); public pricing still register-only
- [ ] **Success / cancel URLs** — ✅ Slice 9 `/billing/success` and `/billing/cancel` pages (webhook still activates plan)
- [ ] **Local webhook testing docs** — Stripe CLI forward to dev API (operator setup)
- [ ] **Decision: activate plan on webhook only** — do not trust client redirect alone (see §F)
- [ ] **Abandoned checkout** — intent stays; active plan unchanged until successful payment
- [ ] **Failed payment / past_due** — define grace period and downgrade/suspend policy
- [ ] **Superadmin override** — decide if manual plan changes remain for support/comp

**Out of scope for first Stripe slice:** booking/order Connect payments, refunds UI, annual billing.

---

## F. Risks / decisions before Stripe

| Topic | Recommended direction |
|-------|----------------------|
| **When does a paid plan activate?** | Only after verified webhook (e.g. `checkout.session.completed` or `customer.subscription.created`). Redirect to success URL is UX only. |
| **Abandoned checkout** | Keep `selected_plan_intent` in settings; `Subscription.plan` stays `free` (or current plan). Offer retry from admin billing UI. |
| **Downgrades** | Use Stripe subscription schedule or immediate change at period end; sync via webhook; superadmin can still override for support with audit trail. |
| **Failed payments** | Set `Subscription.status` to `past_due`; notify owner; define retry/grace before downgrade to `free` or suspend business. |
| **Manual superadmin changes** | Keep available for demos and support; audit with `change_source: superadmin_manual`; document conflict if Stripe subscription also exists. |
| **Register → checkout** | **Decision needed:** Option A — register stays Free, then “Subscribe” on admin settings. Option B — register redirects to checkout after account creation. Slice 4 keeps Option A (current); revisit in Stripe slice 4 (frontend checkout button). |
| **Intent vs subscription** | Never treat `selected_plan_intent` as proof of payment. Stripe Customer/Subscription IDs should be stored separately when added. |

---

## G. Recommended next Stripe slices

Practical order (one slice at a time; keep CI green):

1. **Stripe config / env validation only** — ✅ Slice 5 — settings + `check_production_env.py` + `stripe_config.py`; disabled by default
2. **Checkout session backend** — ✅ Slice 6
3. **Webhook backend** — ✅ Slice 7 (`checkout.session.completed`); failed payments/cancellations deferred
4. **Frontend checkout button** — ✅ Slice 8 Admin Settings
5. **Billing success/cancel pages** — ✅ Slice 9
6. **Billing portal / refunds / downgrades** — deferred
5. **Superadmin Stripe status display** — show Stripe customer/subscription ID, last payment status (read-only).
6. **Production deployment / payment checklist** — live keys, webhook URL, HTTPS, monitoring; update `PRODUCTION_CHECKLIST.md`.
7. **Documentation** — operator runbook, test-mode vs live-mode, rollback if webhook fails.

---

## H. Billing smoke flow status (Slice 10)

End-to-end billing/Stripe **preparation** checkpoint — no live Stripe, no real payments.

| Step | Status |
|------|--------|
| **Pricing visible** | Landing `/` shows Free, Starter, Business, Pro with prices and **Choose plan** links. |
| **Register selected plan** | `/register?plan=…` pre-selects plan; backend stores `selected_plan_intent` (not active plan). |
| **Admin checkout button** | Admin → Settings calls `POST .../billing/checkout-session`; redirects to Stripe when enabled. |
| **Checkout session create** | Does **not** activate `Subscription.plan` — plan change only via webhook. |
| **Webhook activation** | Mocked tests: `checkout.session.completed` updates plan + audit log (`change_source: stripe_webhook`). |
| **Success / cancel pages** | `/billing/success` and `/billing/cancel` are friendly redirect targets; no plan mutation on page load. |
| **Default local behavior** | `STRIPE_ENABLED=false` — admin checkout shows friendly manual billing message; no payment attempted. |
| **Live Stripe** | Requires `STRIPE_ENABLED=true`, real env vars, HTTPS webhook URL, and Stripe CLI or dashboard webhook setup in production. |

**Not implemented:** billing portal, refunds, downgrades, success-page payment verification.

**Next step for real Stripe test:** [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) — test keys, Stripe CLI, local checkout flow (Slice 11).

---

## I. Stripe test mode readiness (Slice 11)

Documentation-only slice. No product logic changes.

| Item | Status |
|------|--------|
| Test mode operator guide | [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) |
| Live Stripe enabled | **No** — still `STRIPE_ENABLED=false` by default |
| Billing portal / refunds / downgrades | Not implemented |

---

## Verification

**Consistency scripts (optional):**

```bash
docker compose exec api python scripts/check_billing_flow.py
docker compose exec api python scripts/check_billing_readiness.py
```

**Manual smoke:**

- `http://localhost:5173` — pricing visible
- `http://localhost:5173/register?plan=business` — Business pre-selected
- `http://localhost:5173/admin/settings` — billing section with checkout buttons (`STRIPE_DISABLED` message when off)
- `http://localhost:5173/billing/success?session_id=cs_test_123` — success page renders
- `http://localhost:5173/billing/cancel` — cancel page renders
- `http://localhost:5173/superadmin/businesses` — active plan vs signup intent (after test registration)

**Last updated:** Phase 5 Slice 11 — Stripe test mode readiness guide.
