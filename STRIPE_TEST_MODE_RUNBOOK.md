# Stripe Test Mode Operator Runbook — VPS Launch

Operator guide for safely configuring and testing **Stripe test mode** on the VPS. This is **production operations documentation only** — not tax/VAT advice, not payment compliance, and **not** live payment activation.

**Related:** [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md) (local dev + Stripe CLI) · [BILLING_READINESS_REPORT.md](./BILLING_READINESS_REPORT.md) · [README_BACKEND.md](./README_BACKEND.md) · [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) · [SMTP_OPERATOR_RUNBOOK.md](./SMTP_OPERATOR_RUNBOOK.md) (parallel operator pattern).

**API endpoints (existing):**


| Endpoint                                                         | Purpose                                          |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `POST /api/v1/businesses/{business_id}/billing/checkout-session` | Create Stripe Checkout session (paid plans only) |
| `POST /api/v1/billing/stripe/webhook`                            | Receive Stripe webhook events (plan activation)  |


**Frontend:** Admin → Settings checkout buttons; redirect pages `/billing/success`, `/billing/cancel`.

---



## A. Current safe defaults


| Item                | Default       | Meaning                                                          |
| ------------------- | ------------- | ---------------------------------------------------------------- |
| `STRIPE_ENABLED`    | `false`       | Checkout API returns disabled/safe error; no Stripe calls        |
| Stripe secret keys  | unset in repo | `.env.production.example` has empty placeholders only            |
| Live payments       | **off**       | No live keys (`sk matta live matta three point`) in this runbook |
| Manual plan changes | **separate**  | Superadmin can set `subscriptions.plan` without Stripe           |


**Implications:**

- CI, local dev, and a fresh VPS do not process payments until an operator explicitly enables Stripe with test keys.
- No Stripe secrets are committed to git.
- Signup `selected_plan_intent` in `business.settings` is **not** the active plan — webhook or superadmin PATCH sets `subscriptions.plan`.
- Automated tests use mocked Stripe only — no real network calls.

---



## B. Required Stripe test variables

Configure these in `.env` **on the VPS only** (copy from `.env.production.example`). Use **test mode keys only** during this rollout.


| Variable                                    | Purpose                                | Placeholder (not real)                        |
| ------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| `STRIPE_ENABLED`                            | Master switch for checkout/webhook     | `false` → `true` when test-ready              |
| <STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD>     | Stripe API secret key (**test only**)  | `sk_test_placeholder`                         |
| <STRIPE_TEST_WEBHOOK_SECRET_FROM_DASHBOARD> | Webhook signing secret (**test only**) | `whsec_test_placeholder`                      |
| <STRIPE_TEST_PRICE_ID_Starter>              | Price ID for Starter plan              | `price_test_starter_placeholder`              |
| <STRIPE_TEST_PRICE_ID_Business>             | Price ID for Business plan             | `price_test_business_placeholder`             |
| <STRIPE_TEST_PRICE_ID_Pro>                  | Price ID for Pro plan                  | `price_test_pro_placeholder`                  |
| `STRIPE_SUCCESS_URL`                        | Post-checkout success redirect         | `https://your-domain.example/billing/success` |
| `STRIPE_CANCEL_URL`                         | Checkout cancel redirect               | `https://your-domain.example/billing/cancel`  |


**Related public URLs** (also in `.env`; must match your deployed domain):


| Variable         | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `PUBLIC_APP_URL` | Public frontend base URL (ops reference)                   |
| `PUBLIC_API_URL` | Public API base URL (ops reference)                        |
| `CORS_ORIGINS`   | Allowed browser origins — must include your HTTPS frontend |


**Secret handling:**

- Secrets belong **only** in `.env` on the server.
- **Never** commit `.env.production` or paste `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` into chat, issues, or logs.
- Use **test** keys (<STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD>) and **test** price IDs during this runbook — **never** <STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD liv> for test rollout.

**Free plan:** No Stripe price ID — Free is not checkout-eligible. Activation remains default signup or superadmin manual change.

---



## C. Safe activation stages

Follow these stages in order. Do not skip to live keys or real card data.

### Stage 1 — Disabled mode (initial VPS deploy)

```env
STRIPE_ENABLED=false
```

**Verify:**

```bash
docker compose exec api python scripts/check_billing_flow.py
docker compose exec api python scripts/check_billing_readiness.py
docker compose exec api python scripts/check_backend.py
```

**Expected:**

- Checkout API returns `STRIPE_DISABLED` (503) when called.
- Admin Settings shows *"Stripe checkout is not enabled yet."*
- Manual superadmin plan changes still work and persist.

---



### Stage 2 — Test-mode config prepared

Set **test mode only** values in VPS `.env`:

```env
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=<STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD>          # test mode only — VPS only
STRIPE_WEBHOOK_SECRET=<STRIPE_TEST_WEBHOOK_SECRET_FROM_DASHBOARD>        # test mode only — VPS only
STRIPE_PRICE_STARTER=<STRIPE_TEST_PRICE_ID_STARTER>
STRIPE_PRICE_BUSINESS=<STRIPE_TEST_PRICE_ID_BUSINESS>
STRIPE_PRICE_PRO=<STRIPE_TEST_PRICE_ID_PRO>
STRIPE_SUCCESS_URL=https://your-domain.example/billing/success
STRIPE_CANCEL_URL=https://your-domain.example/billing/cancel
```

Create products/prices in Stripe Dashboard with **Test mode** toggle on. Copy test price IDs only.

Restart API after editing `.env`:

```bash
docker compose up -d api
```

**Verify env (on server — values are not printed):**

```bash
docker compose exec api python scripts/check_production_env.py --env-file .env --strict
docker compose exec api python scripts/check_billing_flow.py
docker compose exec api python scripts/check_security_readiness.py
```

**Rules:**

- Use **test** secret key (<STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD>) — reject any <STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD> for this rollout.
- Do **not** enable live payments in this stage.

---



### Stage 3 — Test checkout (one session)

Use Stripe **test card only** (e.g. `4242 4242 4242 4242`, any future expiry, any CVC). **Do not** use real card data.

1. Log in as business owner → **Admin → Settings**.
2. Click **Start checkout** for a paid plan (Starter, Business, or Pro).
3. Complete Stripe Checkout in **test mode**.
4. Confirm redirect to `/billing/success` (UX only — plan not updated here).
5. Optional: start checkout again and cancel — confirm `/billing/cancel` and **no** plan change.

**Expected:**

- `POST .../billing/checkout-session` returns `checkout_url` + `session_id`.
- Checkout session creation **does not** change `Subscription.plan`.
- Success page explains webhook activation — it is **not** the source of truth.

---



### Stage 4 — Test webhook

Register a **test mode** webhook endpoint in Stripe Dashboard:

```
https://your-domain.example/api/v1/billing/stripe/webhook
```

Or use [Stripe CLI forwarding](./STRIPE_TEST_MODE_GUIDE.md) during staging only:

```bash
stripe listen --forward-to https://your-domain.example/api/v1/billing/stripe/webhook
```

Copy the signing secret to `STRIPE_WEBHOOK_SECRET` on the VPS (test `whsec` only). Restart API.

**After completing Stage 3 checkout:**

1. Confirm Stripe delivered `checkout.session.completed` (Dashboard → Developers → Webhooks → event log).
2. Confirm API returned HTTP 200 for the webhook.
3. Confirm **subscription plan** updated to purchased tier (Admin Settings, superadmin business detail, or API).
4. Confirm **audit log** entry: `subscription.plan_changed` with `change_source: stripe_webhook`.
5. Review API logs — **no** secret keys, webhook secrets, or full payment details.

**Webhook is authoritative:** Plan activation must come from server-side webhook processing, not from the success redirect alone.

---



### Stage 5 — Rollback

If checkout or webhook fails, or you need to stop Stripe processing:

1. Set `STRIPE_ENABLED=false` in VPS `.env`.
2. Restart API: `docker compose up -d api`
3. Re-run checks:

```bash
docker compose exec api python scripts/check_billing_flow.py
docker compose exec api python scripts/check_backend.py
```

1. Confirm checkout returns `STRIPE_DISABLED` again.
2. Use **superadmin manual plan change** if a business needs a plan adjustment while Stripe is off.
3. **Do not** delete Stripe keys from `.env` unless rotating credentials — keeping them simplifies re-enabling after fixing webhook/DNS issues.

---



## D. Security rules


| Rule                                                                                   | Why                                 |
| -------------------------------------------------------------------------------------- | ----------------------------------- |
| Never commit `.env.production`                                                         | Contains live/test secrets          |
| Never paste `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` in chat/issues/logs         | Credential exposure                 |
| Never use live keys (<STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD>) during test-mode rollout | Accidental live charges             |
| Never use real card data during tests                                                  | PCI / customer safety               |
| Rotate keys immediately if exposed                                                     | Assume compromise                   |
| Keep Gitleaks / CI green                                                               | Repo must not contain secrets       |
| Do not share checkout session URLs publicly if they contain sensitive context          | Reduce session hijack risk          |
| Redact logs before external support posts                                              | May contain session or business IDs |


---



## E. Webhook safety


| Principle                           | Detail                                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Secret must match endpoint**      | `STRIPE_WEBHOOK_SECRET` must match the signing secret for the URL receiving events — mismatch → `STRIPE_WEBHOOK_SIGNATURE_INVALID` (400) |
| **Invalid signatures rejected**     | API verifies Stripe signature before processing payload                                                                                  |
| **Idempotency**                     | Duplicate deliveries with the same `stripe_event_id` are skipped — safe to retry                                                         |
| **Do not trust success page alone** | `/billing/success` is UX only; plan updates happen in webhook handler                                                                    |
| **Server-side activation**          | `checkout.session.completed` webhook updates `Subscription.plan` + audit log                                                             |
| **HTTPS required on VPS**           | Public webhook URL must be HTTPS; reverse proxy must forward `POST` body and `Stripe-Signature` header                                   |
| **Test vs live separation**         | Test mode keys, prices, and webhook endpoints are separate from live mode — do not mix                                                   |


---



## F. Troubleshooting


| Symptom                                  | Likely cause                                       | What to try                                                                                              |
| ---------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `STRIPE_DISABLED` (503)                  | `STRIPE_ENABLED=false`                             | Set `STRIPE_ENABLED=true`, restart API                                                                   |
| `STRIPE_PRICE_NOT_CONFIGURED` (503)      | Missing `STRIPE_PRICE_*` for requested plan        | Create test price in Dashboard; copy <STRIPE_TEST_PRICE_ID> to `.env`                                    |
| `STRIPE_WEBHOOK_SIGNATURE_INVALID` (400) | Wrong `STRIPE_WEBHOOK_SECRET`                      | Copy secret from active webhook endpoint or CLI session; restart API                                     |
| Accidental live key                      | <STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD> in `.env`  | **Stop** — replace with <STRIPE_TEST_SECRET_KEY_FROM_DASHBOARD>; rotate live key in Dashboard if exposed |
| Checkout works, plan unchanged           | Webhook not received or failed                     | Check Stripe webhook log; API logs; HTTPS/proxy forwarding                                               |
| Success page OK, no audit log            | Webhook never fired                                | Register endpoint URL; confirm `checkout.session.completed` subscribed                                   |
| URL mismatch                             | `STRIPE_SUCCESS_URL` / `CORS_ORIGINS` wrong domain | Align with `PUBLIC_APP_URL` and actual HTTPS origin                                                      |
| Webhook unreachable                      | Firewall, wrong path, HTTP not HTTPS               | Confirm `POST /api/v1/billing/stripe/webhook` returns non-404 from internet                              |
| Proxy strips body/headers                | nginx/reverse proxy misconfig                      | Ensure raw body + `Stripe-Signature` forwarded to API                                                    |
| Manual plan works, Stripe doesn't        | Expected when disabled                             | Complete Stage 2–4; superadmin path is independent                                                       |
| Strict env validation fails              | Missing fields when enabled                        | Run `check_production_env.py --strict`; fix static issue codes only                                      |


**Audit commands (no Stripe network in CI):**

```bash
docker compose exec api python scripts/check_billing_flow.py
docker compose exec api python scripts/check_billing_readiness.py
docker compose exec api python scripts/check_production_env.py --env-file .env --strict
```

---



## G. Verification checklist

Before considering test-mode Stripe “working” on VPS:

- [ ] Git working tree has no `.env` or secret files staged
- [ ] `.env` exists **only on VPS** (not in repo)
- [ ] Stripe keys are **test mode only** (`sk_test_…`, test price IDs)
- [ ] `check_production_env.py --strict` passes on server `.env`
- [ ] `check_billing_flow.py` and `check_billing_readiness.py` pass
- [ ] Checkout **disabled** mode verified (`STRIPE_ENABLED=false`)
- [ ] One **test** checkout completed with test card only
- [ ] Test webhook processed (`checkout.session.completed`)
- [ ] Plan changed after webhook (not from success page alone)
- [ ] Audit log shows `stripe_webhook` change source
- [ ] Logs reviewed — no secrets or raw payment details
- [ ] Manual superadmin plan change still works
- [ ] CI remains green (no secrets committed)

---



## H. Rollback checklist

Use when disabling Stripe or recovering from a failed test:

- [ ] Set `STRIPE_ENABLED=false` in VPS `.env`
- [ ] Restart API container
- [ ] Run `check_billing_flow.py` and `check_backend.py`
- [ ] Confirm checkout returns `STRIPE_DISABLED`
- [ ] Adjust plans via superadmin manual PATCH if needed
- [ ] Do not delete keys unless rotating — keep test config for retry
- [ ] If secrets were exposed, rotate in Stripe Dashboard and update `.env`

---



## I. Known limitations

- **Not live payment readiness** — this runbook covers **test mode** only; live Stripe requires separate business/legal decision and live keys.
- **No tax/VAT/accounting advice** — consult qualified advisors for your jurisdiction.
- **Not implemented (may be future work):** billing portal, refunds, downgrades, proration, success-page payment verification.
- **Legal/pricing text** — paid plan terms, privacy disclosures, and processor list still need review ([LEGAL_PRIVACY_READINESS_REPORT.md](./LEGAL_PRIVACY_READINESS_REPORT.md)).
- **No payment processing compliance guarantee** — operator responsibility to meet PCI, consumer law, and Stripe ToS.
- **Local dev details** — Stripe CLI forwarding and Docker port notes are in [STRIPE_TEST_MODE_GUIDE.md](./STRIPE_TEST_MODE_GUIDE.md), not duplicated here.

---

**Last updated:** Phase 8 Slice 3 — Stripe test mode operator runbook (docs only; no code changes).