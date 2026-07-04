# SMTP Operator Runbook — VPS Launch

Operator guide for safely configuring and testing outbound email on the VPS. This is **production operations documentation only** — not legal advice, not a deliverability guarantee, and not provider-specific setup.

**Related:** [README_BACKEND.md](./README_BACKEND.md) (email settings reference) · [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) · [VPS_DRY_RUN_DEPLOYMENT_CHECKLIST.md](./VPS_DRY_RUN_DEPLOYMENT_CHECKLIST.md) · [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · Phase 8 Slice 1 readiness audit (`scripts/check_email_readiness.py`).

---

## A. Current safe defaults

The application ships with email **disabled** and **dry-run enabled**:

| Setting | Default | Meaning |
|---------|---------|---------|
| `EMAIL_ENABLED` | `false` | No outbound email processing |
| `EMAIL_DRY_RUN` | `true` | When email is enabled, log/simulate only — no SMTP connection |

**Implications:**

- No real email is sent in local dev, CI, or a fresh VPS until an operator explicitly changes these flags.
- No SMTP secrets are committed to git (`.env.production.example` uses empty placeholders).
- Tests and readiness checks never send real mail.

---

## B. Required SMTP variables

Configure these in **`.env` on the VPS only** (copy from `.env.production.example`). Never commit `.env` or `.env.production`.

| Variable | Purpose | Example placeholder (not real) |
|----------|---------|--------------------------------|
| `EMAIL_ENABLED` | Master switch for outbound email | `false` → `true` when ready |
| `EMAIL_DRY_RUN` | Simulate sends without SMTP | `true` → `false` only after live test |
| `SMTP_HOST` | Mail relay hostname | `smtp.example.com` |
| `SMTP_PORT` | Relay port (STARTTLS commonly `587`) | `587` |
| `SMTP_USER` | SMTP auth username (if required) | `apikey` or mailbox user |
| `SMTP_PASSWORD` | SMTP auth password or API key | **secret — VPS only** |
| `SMTP_FROM_EMAIL` | Envelope From / sender address | `noreply@your-domain.example` |
| `SMTP_FROM_NAME` | Display name | `Service Platform` |
| `SMTP_USE_TLS` | Use STARTTLS on connect | `true` |

**Secret handling:**

- Secrets belong **only** in `.env` on the server.
- **Never** commit `.env.production` or paste `SMTP_PASSWORD` into logs, chat, tickets, or issues.
- Use `check_email_readiness.py` for verification — it prints `set` / `not_set`, not actual values.

**Related public URLs** (also in `.env`, not SMTP secrets):

- `EMAIL_VERIFICATION_BASE_URL` — verification link target
- `PASSWORD_RESET_BASE_URL` — password reset link target

---

## C. Safe activation stages

Follow these stages in order. Do not skip to live send without passing earlier checks.

### Stage 1 — Disabled mode (initial VPS deploy)

```env
EMAIL_ENABLED=false
EMAIL_DRY_RUN=true
```

SMTP variables may be empty. Email-related features log dry-run/disabled results only.

**Verify:**

```bash
docker compose exec api python scripts/check_email_readiness.py
```

Expected: passes; reports `EMAIL_ENABLED=false` — SMTP secrets not required.

---

### Stage 2 — Dry-run enabled (config prepared, no real send)

Add SMTP values to `.env` on the VPS. Keep dry-run on:

```env
EMAIL_ENABLED=true
EMAIL_DRY_RUN=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...          # on VPS only — never commit
SMTP_FROM_EMAIL=noreply@your-domain.example
SMTP_FROM_NAME=Service Platform
SMTP_USE_TLS=true
```

Restart the API container after editing `.env`:

```bash
docker compose up -d api
```

**Verify:**

```bash
docker compose exec api python scripts/check_email_readiness.py --strict
```

Expected: passes; dry-run probe returns `EMAIL_DRY_RUN` — **no real email sent**.

---

### Stage 3 — One explicit live test

Only after Stage 2 passes. Disable dry-run:

```env
EMAIL_ENABLED=true
EMAIL_DRY_RUN=false
```

Restart API, then run strict check and **one** intentional test to a recipient you control:

```bash
docker compose exec api python scripts/check_email_readiness.py --strict
docker compose exec api python scripts/check_email_readiness.py --send-test test-recipient@example.com
```

Replace `test-recipient@example.com` with **your own** mailbox address at runtime — do not use a real address in committed docs or tickets.

Alternative (same rules — explicit recipient only):

```bash
docker compose exec api python scripts/send_test_email.py --to test-recipient@example.com
```

**Rules:**

- `--send-test` refuses unless `EMAIL_ENABLED=true` **and** `EMAIL_DRY_RUN=false`.
- Sends exactly **one** test message — never bulk or customer mail.
- Confirm delivery in the recipient inbox (or provider dashboard) before proceeding.

---

### Stage 4 — Production mode

After one successful live test:

- Keep `EMAIL_ENABLED=true` and `EMAIL_DRY_RUN=false`.
- Monitor API logs for send errors — **do not** log or paste full `.env` or passwords.
- Re-run readiness after any SMTP credential rotation:

```bash
docker compose exec api python scripts/check_email_readiness.py --strict
docker compose exec api python scripts/check_backend.py
```

**Before enabling login enforcement or customer-facing email flows**, also run:

```bash
docker compose exec api python scripts/check_email_verification.py
docker compose exec api python scripts/check_password_reset.py
docker compose exec api python scripts/check_email_notifications.py
```

Live operations for verification, reset, and notifications still require separate legal/security review — see [Known limitations](#h-known-limitations).

---

## D. Rollback

If email fails, bounces, or you need to stop outbound mail immediately:

1. **First:** set `EMAIL_DRY_RUN=true` (stops real SMTP while keeping config in place).
2. **Or:** set `EMAIL_ENABLED=false` (fully disables outbound email).
3. Restart the API container: `docker compose up -d api`
4. Re-verify:

```bash
docker compose exec api python scripts/check_email_readiness.py
```

**Do not** delete SMTP secrets from `.env` unless you are rotating credentials or decommissioning email — keeping them simplifies re-enabling after fixing provider/DNS issues.

---

## E. Security rules

| Rule | Why |
|------|-----|
| Never commit `.env.production` | Contains live secrets |
| Never share `SMTP_PASSWORD` in chat, issues, or screenshots | Credential exposure |
| Never print or paste full `.env` in support threads | May include JWT, DB, Stripe, SMTP secrets |
| Never run `--send-test` without an explicit recipient you intend | Prevents accidental mail |
| Rotate SMTP password if accidentally exposed | Assume compromise |
| Keep Gitleaks / CI green | Repo must not contain secrets |
| Use `check_email_readiness.py` for audits | Prints safe summary only |
| Redact logs before sharing externally | May contain tokens or addresses |

---

## F. Troubleshooting

Generic issues — resolve with your SMTP provider’s documentation. This runbook does not recommend a specific provider.

| Symptom / check | Likely cause | What to try |
|-----------------|--------------|-------------|
| `SMTP_HOST_MISSING` in strict mode | Host not set in `.env` | Set `SMTP_HOST`; restart API |
| `SMTP_FROM_EMAIL_MISSING` | From address empty | Set verified sender domain address |
| `SMTP_PASSWORD_MISSING` when user set | Auth required but password empty | Set `SMTP_PASSWORD` on VPS only |
| Connection timeout / refused | Wrong `SMTP_PORT` or firewall | Confirm port (`587` vs `465`); check VPS egress |
| Authentication failed | Wrong user/password | Verify credentials in provider dashboard; rotate if unsure |
| TLS / STARTTLS errors | `SMTP_USE_TLS` mismatch | Match provider requirement (STARTTLS vs implicit TLS) |
| Mail sent but not received | DNS / reputation not ready | Configure SPF, DKIM, DMARC for sending domain |
| Provider blocks login | IP not allowlisted | Use provider-recommended relay or API SMTP |
| `--send-test` refused | Dry-run still on or email disabled | Complete Stage 2 before Stage 3 |

**Audit commands (no real send unless Stage 3):**

```bash
docker compose exec api python scripts/check_email_readiness.py
docker compose exec api python scripts/check_production_env.py --env-file .env --strict
```

---

## G. Verification checklist

Use before and after SMTP go-live:

- [ ] Git working tree has no `.env` or secret files staged
- [ ] `.env` exists **only on VPS** (not in repo)
- [ ] `check_email_readiness.py` passes in current mode
- [ ] `--strict` passes before enabling `EMAIL_DRY_RUN=false`
- [ ] Exactly **one** test email sent intentionally (Stage 3), to an operator-controlled address
- [ ] Application logs reviewed — no passwords, tokens, or full `.env` printed
- [ ] `check_backend.py` passes
- [ ] `check_production_env.py --strict` passes on server `.env`
- [ ] CI remains green (no secrets committed)

---

## H. Known limitations

- **Password reset / verification flows** may exist in code, but enabling live customer email requires operator SMTP setup **and** separate legal/security review — not covered as compliance here.
- **Marketing / newsletter** features are out of scope.
- **Email deliverability monitoring** (bounces, complaints, queue depth) is not implemented — monitor provider dashboard and API logs manually.
- **Provider-specific setup** (API keys, domain verification, dedicated IPs) is not documented in this runbook — follow your provider’s docs.
- **SPF / DKIM / DMARC** are operator/DNS responsibilities; misconfiguration causes spam folder delivery or rejection.
- This runbook provides **no guarantee** of inbox placement or regulatory compliance for transactional mail.

---

**Last updated:** Phase 8 Slice 2 — SMTP operator runbook (docs only; no code changes).
