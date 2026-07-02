# Legal & Privacy Readiness Report — Phase 7 (Slice 10)

**Purpose:** Plan legal and privacy requirements before **public launch**.  
**Status:** Placeholder legal routes and footer links (Slice 11) — **draft text only**; lawyer review and consent UI still required.  
**Disclaimer:** This document is **not legal advice**. Final policies and consent flows require qualified legal review for your jurisdiction(s).

Related: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [VPS_READINESS_REPORT.md](./VPS_READINESS_REPORT.md) · [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) · [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md)

---

## A. Current status

| Item | Status |
|------|--------|
| **Legal placeholder pages** | ⏳ `/legal/terms`, `/legal/privacy`, `/legal/consent`, `/legal/cookies` — draft only (Slice 11) |
| **Footer legal links** | ✅ Main layout footer (Slice 11) |
| **Consent checkboxes (registration, booking, order)** | ❌ Not implemented — future slice |
| **Lawyer review** | ❌ Not performed |
| **152-FZ / GDPR compliance claimed** | ❌ **Not claimed** — requires legal review |
| **Platform collects personal/business data** | ✅ Yes — accounts, bookings, orders, messages |
| **Public launch with placeholder legal text only** | ❌ **Blocked** — final lawyer-reviewed text required |

**Launch rule:** Do not point public marketing traffic at the platform until legal documents and consent flows are implemented and reviewed.

---

## B. Data collected by the platform

Categories the platform **currently processes or may process** (based on existing product scope):

| Category | Examples | Notes |
|----------|----------|--------|
| **Business owner account** | Email, name (if provided), phone (optional), password hash, role | Auth + admin access |
| **Client account** | Email, name (if provided), phone (optional), password hash | `/me` bookings/orders |
| **Booking data** | Service, date/time, status, client contact details | Guest or registered client |
| **Order / request data** | Request text (`form_data`), status, reference | Quote/order workflow |
| **Order messages** | Message body, sender type, timestamps | Client ↔ business thread |
| **Business public profile** | Business name, slug, services, prices, schedule, contact email | Public `/b/:slug` pages |
| **Subscription / billing metadata** | Plan, Stripe customer/session IDs (when enabled) | No raw card data — Stripe handles PAN |
| **Email verification / reset tokens** | Hashed tokens only in DB | Raw tokens not stored |
| **Technical / ops data** | Server logs, Docker logs, health checks | IP/user-agent if reverse proxy or app logs them later |
| **Future: map / address** | Street address, coordinates | Not in MVP — requires separate consent if published |

**Principle:** Collect only what the product needs; document purposes in the Privacy Policy after legal review.

---

## C. Legal documents needed before public launch

| Document | Purpose | Status |
|----------|---------|--------|
| **Terms of Service / User Agreement** | Platform rules, accounts, acceptable use, liability limits | ❌ Needed |
| **Privacy Policy / Personal Data Processing Policy** | What data, why, retention, processors, user rights, contact | ❌ Needed |
| **Consent to personal data processing** | Lawful basis + explicit consent where required | ❌ Needed (UI + text) |
| **Cookie Policy** | If non-essential cookies or analytics are added | ⏳ Pending until analytics |
| **Public offer / billing terms** | Paid plans, refunds, subscription rules (Stripe) | ⏳ Needed before live billing |
| **Data deletion / account deletion procedure** | How users request erasure | ❌ Needed (process + policy text) |
| **Business public listing rules** | What owners may publish on public pages | ⏳ Future marketplace slice |
| **Marketplace / map listing terms** | Opt-in for directory/map visibility | ⏳ Future feature |

This slice **lists** requirements only — it does **not** draft final legally binding text.

---

## D. Consent and UI requirements

Placeholder patterns only — **not final legal wording**. A lawyer must approve final copy and placement.

| Location | Requirement (draft) |
|----------|---------------------|
| **Registration** (`/register`) | Checkbox + links: *I agree to the [Terms of Service] and [Privacy Policy] and consent to personal data processing as described therein.* |
| **Business owner signup** | Same as registration; clarify business is data controller for its clients |
| **Guest booking form** | Checkbox: *I agree to the processing of my contact details for this booking per the [Privacy Policy].* |
| **Guest order / request form** | Checkbox: *I agree to the processing of my request details per the [Privacy Policy].* |
| **Logged-in client booking/order** | Consent or reference to account terms — legal review |
| **Password reset / email verification** | Link to Privacy Policy in footer or email templates — legal review |
| **Admin settings** | Data retention notice for business owners (what they store about clients) |
| **Footer (all public pages)** | Links: Terms · Privacy · (Cookies if used) · Contact |
| **Future: marketplace listing** | Separate opt-in: *Publish my business on the public directory* |
| **Future: map / address** | Separate opt-in: *Show my business address on the map* |

**Routes to add later (not this slice):** e.g. `/terms`, `/privacy`, `/cookies`, `/billing-terms`.

**Implemented (Slice 11 — placeholder only):** `/legal/terms`, `/legal/privacy`, `/legal/consent`, `/legal/cookies` with footer links in main `Layout`. Text is draft — not final legal advice.

---

## E. Russian 152-FZ readiness notes

**This is not legal advice.** Consult a Russian-qualified lawyer before processing personal data of Russian users or operating a Russia-facing service.

Topics typically reviewed under **Federal Law No. 152-FZ** (personal data):

| Topic | Planning note |
|-------|----------------|
| **Operator identity** | Legal entity name, address, contact for data subjects |
| **Purposes of processing** | Registration, bookings, orders, billing, support |
| **Categories of personal data** | See §B |
| **Processing actions** | Collection, storage, use, transfer, deletion |
| **Lawful basis / consent** | Consent text and checkboxes where required |
| **Storage period** | Retention and deletion rules in Privacy Policy |
| **User rights** | Access, correction, deletion, withdrawal of consent |
| **Cross-border transfer** | If servers or processors are outside Russia |
| **Localization / notification** | May apply depending on operator status and volume — **legal review required** |
| **Public listings / maps** | Publishing business or client-related data may need explicit settings and consent |

**Do not** claim 152-FZ compliance in marketing until a lawyer confirms.

---

## F. GDPR / international notes

The product may later serve **UAE, Tunisia, EU**, or other regions. Before international launch:

| Step | Action |
|------|--------|
| **Identify target jurisdictions** | Where users and businesses are located |
| **EU / GDPR** | If EU users are targeted: lawful basis, DPA with processors, rights (access, erasure, portability), breach notification — **lawyer review** |
| **UAE / Tunisia / others** | Local privacy and consumer laws vary — **lawyer review per market** |
| **Data minimization** | Do not collect fields you do not need |
| **Processor agreements** | Stripe, SMTP provider, hosting — document in Privacy Policy |
| **No premature claims** | Avoid “GDPR compliant” badges without legal sign-off |

---

## G. Implementation roadmap (suggested slices)

| # | Slice | Deliverable |
|---|-------|-------------|
| 1 | Legal routes (placeholder) | ✅ Slice 11 — `/legal/*` draft pages + footer links |
| 2 | Footer links | ✅ Slice 11 — Terms, Privacy, Consent, Cookies |
| 3 | Registration consent | Required checkbox + validation — future |
| 4 | Booking consent | Guest/client booking form checkbox |
| 5 | Order consent | Guest/client order form checkbox |
| 6 | Admin / retention notes | Owner-facing text on client data responsibilities |
| 7 | Account deletion request | Process + API/form (future) |
| 8 | Cookie banner | Only if analytics/non-essential cookies added |
| 9 | Billing terms page | Before `STRIPE_ENABLED=true` on public prod |
| 10 | **Lawyer review** | **Mandatory before public launch** |

**Slice 11:** placeholder routes and footer only — not final legal text or consent enforcement.

---

## H. Launch blockers

Before **public launch**, confirm:

- [ ] **Legal pages live** — Placeholder routes exist (Slice 11); **lawyer-reviewed final text** still required
- [ ] **Consent checkboxes** — registration, booking, order (as required by counsel)
- [ ] **Data retention / deletion policy** — documented and operational process defined
- [ ] **Cookie / analytics policy** — if analytics or non-essential cookies are used
- [ ] **Payment / subscription terms** — before live Stripe billing
- [ ] **Public listing / map consent** — before marketplace or map features
- [ ] **152-FZ / GDPR / local law** — reviewed for chosen markets
- [ ] **Processor list** — hosting, Stripe, SMTP disclosed in Privacy Policy
- [ ] **No “legal advice” claims** — docs and site copy reviewed by counsel

Cross-links: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) · [VPS_DEPLOYMENT_RUNBOOK.md](./VPS_DEPLOYMENT_RUNBOOK.md) §J · [SECURITY_READINESS_REPORT.md](./SECURITY_READINESS_REPORT.md) §F

---

**Last updated:** Phase 7 Slice 11 — legal placeholder routes and footer links (not legal advice).
