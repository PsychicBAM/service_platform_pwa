# Stripe Test Mode Guide — Phase 5 (Slice 11)

**Purpose:** Operator checklist for safely testing Stripe Checkout and webhooks with **test keys only**.  
**Status:** Code is ready; `STRIPE_ENABLED=false` by default. This guide does **not** enable live payments.

Related docs: [BILLING_READINESS_REPORT.md](./BILLING_READINESS_REPORT.md) · [README_BACKEND.md](./README_BACKEND.md) · [README_FRONTEND.md](./README_FRONTEND.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

**Not implemented:** billing portal, refunds, downgrades, success-page payment verification.

---

## A. Current Stripe status

| Item | Status |
|------|--------|
| Checkout session API | `POST /api/v1/businesses/{business_id}/billing/checkout-session` |
| Webhook API | `POST /api/v1/billing/stripe/webhook` |
| Admin Settings checkout buttons | Starter / Business / Pro (paid plans only) |
| Success / cancel pages | `/billing/success`, `/billing/cancel` |
| Stripe enabled by default | **No** — `STRIPE_ENABLED=false` in `.env.example` |
| Automated tests | Mocked Stripe only — no real network calls in CI |
| Live payments | **Not enabled** — use test keys locally/staging only |

Audit scripts (safe, no Stripe network):

```bash
docker compose exec api python scripts/check_billing_flow.py
docker compose exec api python scripts/check_billing_readiness.py
```

---

## B. Required Stripe test mode env vars

Copy `.env.example` to `.env` at the **project root** (loaded by Docker `api` service). Set:

```env
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_SUCCESS_URL=http://localhost:5173/billing/success
STRIPE_CANCEL_URL=http://localhost:5173/billing/cancel
```

| Variable | Notes |
|----------|--------|
| `STRIPE_ENABLED` | Must be `true` to create checkout sessions |
| `STRIPE_SECRET_KEY` | **Test** secret key (`sk_test_…`) from Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | From Stripe CLI `listen` output or a test webhook endpoint in Dashboard |
| `STRIPE_PRICE_*` | Recurring monthly price IDs for Starter, Business, Pro |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | Where Stripe redirects after checkout; must match your local frontend URL |

### Warnings

- **Never commit `.env`** — it is gitignored; use `.env.example` for placeholders only.
- Use **test keys** (`sk_test_…`, `pk_test_…`) for local and staging only.
- **Live keys** (`sk_live_…`) belong only on the production server secrets store — never in git or shared chat.
- Rotating keys in Stripe invalidates old values; update `.env` and restart the API.

Validate configuration (from project root on host):

```bash
python scripts/check_production_env.py --strict
```

When `STRIPE_ENABLED=true`, strict mode requires secret key, webhook secret, and all three price IDs.

---

## C. Stripe dashboard setup

Use **Test mode** (toggle in Stripe Dashboard) for all steps below.

- [ ] Create a **Product** for each paid tier: Starter, Business, Pro
- [ ] Add a **recurring monthly** price for each product (match displayed SaaS prices: $19 / $49 / $99 or your chosen test amounts)
- [ ] Copy each **Price ID** (`price_…`) into `.env` as `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_PRO`
- [ ] Confirm **currency** (e.g. USD) and **billing interval** (monthly)
- [ ] Keep the **Free** plan **outside Stripe** — no price ID; Free is not checkout-eligible

Free plan activation remains manual (superadmin) or via signup default (`Subscription.plan=free`).

---

## D. Stripe CLI webhook forwarding

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then forward events to the local API:

```bash
stripe login
stripe listen --forward-to localhost:8000/api/v1/billing/stripe/webhook
```

The CLI prints a webhook signing secret like `whsec_…`. Copy it to `STRIPE_WEBHOOK_SECRET` in `.env`, then restart the API:

```bash
docker compose up -d api
```

Keep `stripe listen` running in a separate terminal while testing. It forwards `checkout.session.completed` (and other events) to your local webhook handler.

**Production:** use an HTTPS webhook URL in the Stripe Dashboard instead of CLI forwarding.

---

## E. Local test flow

Prerequisites: Docker stack running, demo data seeded (`seed_demo.py`), Stripe test products/prices created.

- [ ] Set `STRIPE_ENABLED=true` and fill test keys/price IDs in root `.env`
- [ ] Start webhook forwarding: `stripe listen --forward-to localhost:8000/api/v1/billing/stripe/webhook`
- [ ] Copy CLI `whsec_…` to `STRIPE_WEBHOOK_SECRET`; restart API
- [ ] Run env validation: `python scripts/check_production_env.py --strict`
- [ ] Run backend audits:
  ```bash
  docker compose exec api python scripts/check_billing_readiness.py
  docker compose exec api python scripts/check_billing_flow.py
  docker compose exec api python scripts/check_backend.py
  ```
- [ ] Open **Admin → Settings**: `http://localhost:5173/admin/settings` (login: `owner@example.com` / `ChangeMe123!` after seed)
- [ ] Click **Start Business checkout** (or Starter / Pro)
- [ ] Complete Stripe Checkout with a **test card** (e.g. `4242 4242 4242 4242`, any future expiry, any CVC)
- [ ] Stripe redirects to `/billing/success?session_id=cs_test_…`
- [ ] Confirm webhook received in `stripe listen` terminal (`checkout.session.completed`)
- [ ] Confirm **subscription plan** updated (Admin Settings read-only section, superadmin business detail, or API)
- [ ] Confirm **audit log**: `subscription.plan_changed` with `change_source: stripe_webhook` at `/superadmin/audit-logs`

Optional cancel path: start checkout again, click **Back** or close — lands on `/billing/cancel`; plan must **not** change.

---

## F. Expected behavior

| Step | Expected |
|------|----------|
| `POST .../billing/checkout-session` | Returns `checkout_url` + `session_id`; **does not** change `Subscription.plan` |
| User pays in Stripe Checkout | Stripe processes test payment only (test mode) |
| `checkout.session.completed` webhook | Updates `Subscription.plan` to purchased tier + writes audit log (`change_source: stripe_webhook`) |
| `/billing/success` | UX only — explains webhook activation; **does not** update plan |
| `/billing/cancel` | UX only — no payment, **no** plan change |
| Duplicate webhook delivery | Idempotent — same `stripe_event_id` skipped |

Signup `selected_plan_intent` is unrelated to Stripe activation; webhook sets the **active** plan.

---

## G. Troubleshooting

### `STRIPE_DISABLED` (503)

- **Cause:** `STRIPE_ENABLED=false` or unset.
- **Fix:** Set `STRIPE_ENABLED=true` in `.env`, restart API. Admin UI shows: *"Stripe checkout is not enabled yet."*

### `STRIPE_PRICE_NOT_CONFIGURED` (503)

- **Cause:** Missing or empty `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_BUSINESS` / `STRIPE_PRICE_PRO` for the requested plan.
- **Fix:** Create prices in Stripe test mode, copy `price_…` IDs into `.env`, restart API.

### `STRIPE_WEBHOOK_SIGNATURE_INVALID` (400)

- **Cause:** `STRIPE_WEBHOOK_SECRET` does not match the signing secret for the endpoint receiving events.
- **Fix:** Use the secret from the **currently running** `stripe listen` session, or from the Dashboard webhook endpoint that points to your URL. Restart API after updating `.env`.

### Success page shown but plan not updated

- **Cause:** Webhook not received, failed signature, or CLI not forwarding.
- **Check:** `stripe listen` output for `checkout.session.completed` and HTTP 200 from API.
- **Check:** API logs for webhook errors.
- **Remember:** Success redirect is **not** the source of truth — only the webhook updates the plan.

### Webhook secret mismatch after restart

- **Cause:** New `stripe listen` session generates a new `whsec_…`.
- **Fix:** Copy the new secret to `.env` and restart API each time you start a fresh `listen` (unless using a fixed Dashboard test endpoint).

### Docker vs Vite dev port confusion

| URL | What serves it |
|-----|----------------|
| `http://localhost:5173` | Docker `web` container (nginx static build) |
| `http://localhost:5174` | Vite dev server (`npm run dev` in `web/`) — used by Playwright e2e |

If you change frontend code locally, **rebuild** Docker web (`docker compose up -d --build web`) or use Vite on **5174** and set `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` accordingly.

### Stale Docker frontend on port 5173

- **Symptom:** Old billing UI or missing pages after frontend changes.
- **Fix:** `docker compose up -d --build web` or test on Vite dev port 5174.

### API not picking up `.env` changes

- **Fix:** `docker compose up -d api` (recreate container) after editing root `.env`.

---

## H. Production caution

Do **not** enable live Stripe until:

- [ ] VPS deployed with **HTTPS** and valid domain
- [ ] [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) completed (SMTP, backups, monitoring, security)
- [ ] Live webhook URL registered in Stripe Dashboard (`https://your-domain/api/v1/billing/stripe/webhook`)
- [ ] Live **secret** keys stored only in server environment (not git)
- [ ] Small internal test account used first before opening to customers

Additional rules:

- Use **HTTPS** webhook URLs in production — Stripe requires it for live mode.
- **Rotate secrets** immediately if a key or webhook secret is exposed.
- **Test mode** and **live mode** use separate keys, prices, and webhook endpoints — do not mix them.
- Billing portal, refunds, and downgrades are **not** implemented — handle support cases manually until future slices.

---

**Last updated:** Phase 5 Slice 11 — Stripe test mode readiness checklist (documentation only).
