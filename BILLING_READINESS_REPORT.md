# Billing Readiness Report — Phase 5 (Slices 4–5)

**Purpose:** Document current manual/demo billing behavior and define what must be built before Stripe integration.  
**Status:** Billing is manual/demo only. **Stripe checkout, webhooks, and real charges are not implemented.** Stripe config/env validation exists (Slice 5); `STRIPE_ENABLED=false` by default.

Related docs: [MVP_RELEASE_REPORT.md](./MVP_RELEASE_REPORT.md) · [README_BACKEND.md](./README_BACKEND.md) · [README_FRONTEND.md](./README_FRONTEND.md) · [FRONTEND_UX_CHECKLIST.md](./FRONTEND_UX_CHECKLIST.md)

### Slice 5 — Stripe config validation (no payments)

- Settings: `STRIPE_ENABLED`, secret/webhook keys, price IDs (`starter`/`business`/`pro`), success/cancel URLs
- `scripts/check_production_env.py --strict` enforces Stripe fields only when `STRIPE_ENABLED=true`
- `api/app/services/stripe_config.py` maps plans to price env vars (no Stripe SDK calls in helper)
- Next slice: checkout session backend with mocked tests

### Slice 6 — Backend checkout session (no webhook / no frontend button)

- `POST /api/v1/businesses/{business_id}/billing/checkout-session` — auth + business admin required
- Returns `checkout_url` and `session_id` when `STRIPE_ENABLED=true` and price IDs configured
- Mocked Stripe in tests only; **no webhook** — successful payment does not change `Subscription.plan`
- Manual superadmin plan changes still required until webhook slice
- Frontend checkout button not implemented yet

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
| **Payments** | No Stripe keys required, no checkout, no webhooks, no automatic upgrades, no charges. Helper copy: *“Plan changes are manual. Stripe checkout is not connected yet.”* |

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

- [ ] **Environment variables** — `STRIPE_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs per plan, success/cancel URLs — ✅ config fields + `check_production_env.py` strict rules (Slice 5); checkout/webhooks not built yet
- [ ] **Stripe price IDs** — one recurring price per paid plan (`starter`, `business`, `pro`); map to `SubscriptionPlan` enum
- [ ] **Checkout session endpoint** — create Stripe Checkout Session for platform subscription (business owner context)
- [ ] **Success / cancel URLs** — redirect back to app (e.g. `/admin/settings` or dedicated billing page)
- [ ] **Webhook endpoint** — `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] **Idempotency** — dedupe webhook events (store processed event IDs)
- [ ] **Subscription status sync** — update `Subscription.plan` and `Subscription.status` from Stripe (not from register intent alone)
- [ ] **Audit logs for Stripe events** — e.g. `subscription.plan_changed` with `change_source: stripe_webhook`
- [ ] **Tests with mocked Stripe** — unit/integration tests; no real network in CI
- [ ] **Local webhook testing docs** — Stripe CLI forward to dev API
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
2. **Checkout session backend** — ✅ Slice 6 — `POST /api/v1/businesses/{business_id}/billing/checkout-session`; mocked Stripe tests; no webhook yet
3. **Webhook backend** — signature verification, idempotency table, plan/status sync, audit logs; Stripe CLI fixture tests.
4. **Frontend checkout button** — admin/settings “Upgrade plan” → checkout; success/cancel pages; still no register-time checkout unless product decides otherwise.
5. **Superadmin Stripe status display** — show Stripe customer/subscription ID, last payment status (read-only).
6. **Production deployment / payment checklist** — live keys, webhook URL, HTTPS, monitoring; update `PRODUCTION_CHECKLIST.md`.
7. **Documentation** — operator runbook, test-mode vs live-mode, rollback if webhook fails.

---

## Verification

**Consistency script (optional):**

```bash
docker compose exec api python scripts/check_billing_readiness.py
```

**Manual smoke:**

- `http://localhost:5173` — pricing visible
- `http://localhost:5173/register?plan=business` — Business pre-selected
- `http://localhost:5173/superadmin/businesses` — active plan vs signup intent (after test registration)

**Last updated:** Phase 5 Slice 6 — backend checkout session endpoint (mocked tests; no webhook).
