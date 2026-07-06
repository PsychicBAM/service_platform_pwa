# Pro Mini-site MVP Plan — Phase 10 Slice 3

**Status:** Planning only (Slice 3A). No code, migrations, or API changes in this slice.

**Last updated:** Phase 10 Slice 3A — design and implementation roadmap before coding.

---

## 1. Purpose

The **Pro mini-site** is a richer public business page for Pro subscribers. Today every business shares the same simple `/b/<slug>` layout: name, optional logo URL, description, contact details, and links into the existing services / booking / request flows.

Pro should feel meaningfully higher tier than Business. The mini-site turns the public page into a small **business profile / lightweight website**: clearer hero, about section, prominent service and action CTAs, contact and social links, and placeholders for future media — without replacing booking or order functionality.

Goals:

- Make Pro **visibly more valuable** on the public side (not only in admin plan UI).
- Reuse existing data and routes where possible; add only what is needed for MVP.
- Ship in **small, safe slices** with CI green after each step.
- Defer media upload, custom domains, enforcement, and advanced themes to later phases.

---

## 2. Current state

### Public page (`/b/<slug>`)

- **Entry:** `PublicHomePage` — platform landing at `/`; business home at `/b/:slug`.
- **Data:** `GET` public business by slug → `PublicBusinessRead` (name, slug, description, logo_url, operating_mode, contact_phone, address).
- **UI:** Single card with logo or initial, name, operating-mode intro, optional description / address / phone; CTAs to `/b/<slug>/services`, `/me/bookings`, `/me/orders` as appropriate.
- **Related routes (unchanged in MVP planning):** `/b/:slug/services`, service detail, `/book`, `/request`.
- **Plan not on public API:** Subscription plan is **not** exposed on `PublicBusinessRead` today. Pro vs non-Pro layout will need a deliberate, minimal addition later (see §6 and §8).

### Owner admin

- **Dashboard:** `CurrentPlanCard`, `PublicBusinessLinkCard` (URL, copy, share, QR).
- **Settings:** Business profile fields (name, description, logo URL, contact email/phone, address, timezone), operating mode, booking settings, billing/plan section with `PlanFeatureComparison` and `ProToolsComingSoonCard`.
- **Logo:** `logo_url` is a **URL string** only — no upload pipeline.

### Plan UI (Phase 10 Slice 2)

- Plan badges, feature comparison, and “Pro tools coming soon” hints are **UI-only**.
- No feature locking or route blocking.

### Gaps relevant to mini-site

| Area | State |
|------|--------|
| Rich public layout | Not implemented |
| Social links (Instagram, website, etc.) | Not on business model |
| Cover / banner image | Not supported |
| Gallery / media | No Media Foundation (Phase 10 Slice 4) |
| Plan-based public rendering | No public `plan` field yet |
| Real plan enforcement | Planned Phase 10 Slice 8 |
| Custom domains | Out of scope |

---

## 3. MVP scope

**In scope for the Pro mini-site MVP** (first shippable version):

| Item | MVP approach |
|------|----------------|
| Public mini-site **layout** for Pro businesses | New layout component(s); same URL `/b/<slug>` |
| Business identity | Existing `name`, `slug` |
| About / description | Existing `description` (admin Settings → Business profile) |
| Logo | Existing `logo_url` if set; placeholder initial otherwise |
| Services | Link / embed path to existing `/b/<slug>/services` list |
| Booking CTA | Link into existing book flow (operating_mode aware) |
| Request / order CTA | Link into existing request flow (operating_mode aware) |
| Contact | Existing `contact_phone`, `address`; optional `contact_email` if added to public read |
| Social links | **Simple text/URL fields** (e.g. website, Instagram) — no OAuth |
| Non-Pro businesses | Keep **current** simple public page |
| Media | **No upload** — placeholder “Gallery coming soon” section only until Media Foundation |

**MVP page sections (Pro layout, top to bottom):**

1. **Hero** — name, logo, short tagline (from description excerpt or first line).
2. **About** — full `description` when present.
3. **Services** — preview + “View all services” → existing services route.
4. **Actions** — primary “Book” / “Request” CTAs (respect `operating_mode`).
5. **Contact** — phone, address, email (if exposed).
6. **Social** — optional links (website, etc.) when fields exist.
7. **Gallery (placeholder)** — static “Media gallery coming soon” — no images until Slice 4.

---

## 4. Out of scope for MVP

Do **not** include in the Pro mini-site MVP:

- Custom domains
- Media upload, image CDN, or gallery storage (wait for **Media Foundation**, Phase 10 Slice 4)
- Paid plan **enforcement** or hard feature locks (wait for Phase 10 Slice 8)
- Advanced themes / per-business CSS
- Analytics or visit tracking
- SEO automation (sitemaps, structured data beyond basic page title)
- Reviews or ratings
- Blog, posts, or feed
- Marketplace or discovery
- Complex social network features (followers, DMs, etc.)
- Stripe, checkout, or billing changes
- Breaking changes to `/b/<slug>/services`, book, or request flows

---

## 5. Proposed data model options

### Option A — Extend `business.settings` JSON

Add a nested object, e.g. `settings.public_profile`:

```json
{
  "tagline": "Optional short line",
  "social_links": {
    "website": "https://example.com",
    "instagram": "https://instagram.com/handle"
  },
  "show_gallery_placeholder": true
}
```

| Pros | Cons |
|------|------|
| No new table or migration complexity beyond JSON merge | Less structured; harder to query/index later |
| Matches existing `settings` pattern for booking options | Public vs admin field validation must be explicit |
| Fastest path for MVP | Social links schema can grow messy without discipline |

### Option B — New `business_public_profiles` table

Dedicated row per business: `business_id`, `tagline`, `about_override`, JSON `social_links`, `theme_key`, timestamps.

| Pros | Cons |
|------|------|
| Clear separation of public marketing vs operational settings | New model, repository, migration, tests |
| Easier to extend with media FKs later | More moving parts for MVP |
| Cleaner public API mapping | Duplication risk with `description` on `businesses` |

### Option C — Hybrid

Keep **core fields** on `businesses` (`name`, `description`, `logo_url`, `contact_*`, `address`). Add **`settings.public_profile`** (or slim JSON column) only for **mini-site extras**: tagline, social links, future `cover_image_url` / gallery refs.

| Pros | Cons |
|------|------|
| Reuses fields owners already edit in Settings | Two places to document for “public profile” |
| Avoids duplicating description | Still requires schema/docs for JSON shape |
| Safe stepping stone to table later if needed | |

### Recommendation for MVP: **Option C (hybrid)**

**Reasoning:**

- `description`, `logo_url`, and contact fields **already exist** and are edited in Admin Settings — do not duplicate them.
- MVP-only extras (tagline, social URLs) fit a **small JSON blob** in `settings` without a new table.
- Avoids over-engineering before we know gallery/media shape (Slice 4 may justify a table or media join table).
- Public API can expose a flattened `PublicBusinessProfileRead` DTO assembled from `businesses` + `settings.public_profile` + (later) `plan`.

**Validation rules (when implemented):**

- Social URLs: optional, max length, `http`/`https` only.
- Tagline: optional, short max length (e.g. 160 chars).
- No binary upload fields until Media Foundation.

---

## 6. Proposed frontend approach

### Routing

- **Keep** `/b/<slug>` as the single public entry point (no new public URL scheme for MVP).
- **Branch inside** `PublicHomePage` / `BusinessHomeContent`:
  - If business is **Pro** (once plan is available on public read) → render `ProMiniSiteLayout`.
  - Else → render existing simple layout (**no regression**).

### Components (future slices)

| Component | Role |
|-----------|------|
| `ProMiniSiteLayout` | Section shell: hero, about, services strip, CTAs, contact, social, gallery placeholder |
| `PublicBusinessHero` | Name, logo, tagline |
| `PublicServicesPreview` | Teaser + link to `/b/<slug>/services` |
| `PublicActionCtas` | Book / request buttons (reuse `operating_mode` helpers from today) |
| `PublicContactBlock` | Phone, address, email |
| `PublicSocialLinks` | External links, `rel="noopener noreferrer"` |
| `PublicGalleryPlaceholder` | “Coming soon” copy only |

### Data loading

- Extend public API response with `plan` (or `is_pro_mini_site: boolean`) and optional `public_profile` fields — **minimal backend change in Slice 3D**, not in 3A.
- Until then, Slice 3B may use a **feature flag or dev-only prop** for layout skeleton work (clearly marked, not production gating).

### Non-negotiables

- Existing **booking** and **order/request** flows remain the same routes and APIs.
- Services list/detail/book/request pages **unchanged** in early slices; mini-site only enhances the **home** view at `/b/<slug>`.

---

## 7. Proposed admin approach

### New section: **Public profile** (future)

Location: Admin Settings (below Business profile or as a sub-section), or a dedicated tab later if the form grows.

| Field | MVP |
|-------|-----|
| Description / about | **Already in** Business profile — link or duplicate read-only hint “Shown on public page” |
| Tagline | New (from `settings.public_profile`) when backend ready |
| Social links | New URL fields (website, Instagram, etc.) |
| Logo | Existing `logo_url` — URL only; label “Image upload coming with Media Foundation” |
| Cover / banner | **Disabled** placeholder input or help text only |
| Gallery | **Disabled** — “Available after Media Foundation” |

### UX principles

- Pro-only **labels** (“Pro public profile”) are OK in Slice 3C UI mockups.
- Do **not** block saving other settings if user is not on Pro.
- Preview link continues to use `PublicBusinessLinkCard` → `/b/<slug>`.

---

## 8. Plan gating approach

| Phase | Behavior |
|-------|----------|
| **Slices 3B–3E (MVP build)** | Prefer **soft** gating: render Pro layout when `plan === "pro"` on public read; otherwise current page. Optional dev flag for local testing. |
| **Admin UI** | Show “Pro” badges and coming-soon copy (already started in Slice 2C). |
| **No hard blocks** | Non-Pro owners can still use all current admin and public features; no 403 on routes. |
| **Phase 10 Slice 8** | Introduce real **plan enforcement** (limits, optional blocks) after mini-site and media foundations are stable. |

**Public plan exposure (required before 3F):**

- Add `plan` (or `subscription_plan`) to `PublicBusinessRead` — sourced from subscription, defaulting to `free` when absent.
- Only expose **plan tier**, not billing IDs or Stripe fields.

**Fallback if plan missing:** Treat as non-Pro (simple layout). Public page must never error.

---

## 9. Implementation slices

| Slice | Deliverable | Code? |
|-------|-------------|-------|
| **3A** ✅ | This document | Docs only |
| **3B** | Public mini-site **layout skeleton** using existing `PublicBusinessRead` fields only; Pro branch behind flag or mock `plan` | Frontend |
| **3C** | Admin **Public profile** section — UI/mock fields, disabled media; no new persistence required initially | Frontend |
| **3D** | Backend: `settings.public_profile` shape, validation, admin update + public read fields; optional `plan` on public API | Backend + types |
| **3E** | Wire saved profile fields into `ProMiniSiteLayout`; tagline + social links live | Full stack |
| **3F** | Pro-only visual gating on public home; non-Pro fallback verified; remove dev flags | Frontend + API |
| **4+** | **Media Foundation** — upload, cover, gallery (separate phase; blocks real gallery) | TBD |
| **8** | Plan enforcement (limits, locking per product decision) | Backend + frontend |

**Dependency order:** 3B can start with existing data → 3D enables 3E → 3F needs public `plan` → media slices depend on Phase 10 Slice 4.

**Testing expectations per slice:**

- Unit/smoke tests for layout branch and admin section.
- Existing `public-pages` and e2e admin-guards / public business tests must pass.
- No new Playwright requirement for 3A.

---

## 10. Acceptance criteria (future MVP complete)

When Slices 3B–3F are done (and still **without** media upload or enforcement):

- [ ] `/b/<slug>` loads for all businesses; **no 404/500** for non-Pro.
- [ ] **Booking flow** unchanged: `/b/<slug>/services/.../book` still works.
- [ ] **Order/request flow** unchanged: `/b/<slug>/services/.../request` still works.
- [ ] Non-Pro businesses see the **current simple** public home layout.
- [ ] Pro businesses see the **richer mini-site** layout on the same URL.
- [ ] Description, logo URL, contact fields reflect admin Settings (and new public profile fields when saved).
- [ ] Social links render only when valid URLs are saved.
- [ ] Gallery section shows **coming soon** placeholder only — no upload UI.
- [ ] No custom domain, Stripe, or enforcement changes in this MVP.
- [ ] **CI green:** `npm run test`, `typecheck`, `build`, `check:routes`; API tests pass when backend touched.

---

## References (in-repo)

| Topic | Location |
|-------|----------|
| Public home UI | `web/src/pages/PublicHomePage.tsx` |
| Public API types | `web/src/api/publicApi.ts`, `api/app/schemas/business.py` (`PublicBusinessRead`) |
| Admin settings | `web/src/pages/admin/AdminSettingsPage.tsx` |
| Plan UI | `CurrentPlanCard`, `PlanFeatureComparison`, `ProToolsComingSoonCard`, `PlanBadge` |
| Public routes | `web/src` router — `/b/:slug`, services, book, request |

---

## Summary

The Pro mini-site MVP enhances **`/b/<slug>`** for Pro businesses with a structured profile layout while **reusing** existing services, booking, and request flows. Store mini-site extras in a **hybrid** model (`businesses` + `settings.public_profile`). Ship incrementally from layout skeleton → admin UI → backend fields → live rendering → plan-based display. Defer **media** to Phase 10 Slice 4 and **enforcement** to Phase 10 Slice 8.
