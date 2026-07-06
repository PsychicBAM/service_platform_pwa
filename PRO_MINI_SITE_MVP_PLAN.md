# Pro Mini-site Builder Plan — Phase 10

**Status:** Living design document. Planning and incremental implementation.

**Last updated:** Phase 10 — expand from simple profile page to **section-based mini-site builder** direction.

---

## 1. Purpose and product direction

The **Pro mini-site** is a richer public business page for eligible Pro businesses. It should feel like a small **website / landing page**, not just a booking card with a logo.

### What we are building

A **controlled section-based mini-site builder** inside the SaaS:

- The owner edits **structured sections** (hero, about, services, FAQ, etc.).
- The public page at `/b/<slug>` **renders those sections** as a polished landing page.
- Theme options (colors, button style) apply consistently across sections.
- Booking and request flows stay on existing routes — the mini-site **drives CTAs**, not replacements.

### What we are NOT building (MVP)

- **Not** a freeform Webflow/Tilda-style editor with arbitrary div positioning.
- **Not** pixel-level layout control, custom CSS, or user-placed blocks anywhere on a canvas.
- **Not** a full website builder with unlimited pages, blogs, or marketplaces.

**Why controlled sections:** Freeform builders add high complexity — broken mobile layouts, inconsistent customer designs, more storage/testing surface, and higher risk of breaking public pages. MVP stays **structured, safe, and maintainable**.

### Goals

- Make Pro **visibly more valuable** on the public side.
- Let owners create a page that feels like a **small brand landing page**.
- Ship in **small, safe slices** with CI green after each step.
- Defer **media upload** (Phase 10 Slice 4), **custom domains**, and **plan enforcement** (Phase 10 Slice 8).

---

## 2. Current state (as of Phase 10 Slice 3D)

### Public page (`/b/<slug>`)

| Item | State |
|------|--------|
| Standard layout | `StandardPublicBusinessHome` for non–mini-site businesses |
| Pro layout skeleton | `ProMiniSiteLayout` — hero, services preview, contact, gallery placeholder |
| Plan branching | `public_page_variant`: `"standard"` \| `"mini_site"` on public business API |
| Eligibility | `mini_site` only for **active Pro** subscriptions (server-computed; no billing internals exposed) |
| Booking / request | Unchanged routes: `/b/<slug>/services`, `/book`, `/request` |

### Owner admin

| Item | State |
|------|--------|
| Plan UI | `CurrentPlanCard`, `PlanFeatureComparison`, `ProToolsComingSoonCard`, `PlanBadge` |
| Public profile skeleton | `PublicProfileSettingsCard` on Settings — disabled fields, “Saving coming soon” |
| Mini-site editor | **Not implemented** |
| Theme editor | **Not implemented** |
| Section config persistence | **Not implemented** |

### Media and enforcement

| Item | State |
|------|--------|
| Logo / images | `logo_url` string only; no upload pipeline |
| Gallery / cover | Placeholders only until **Media Foundation** (Phase 10 Slice 4) |
| Plan enforcement | UI hints only; real locks in **Phase 10 Slice 8** |

---

## 3. Builder sections (proposed)

Each section is a **typed block** with a fixed layout variant and editable content fields. Owners can **enable/disable** sections in MVP; **reordering** can follow in a later slice.

| Section | Purpose | MVP content fields (examples) |
|---------|---------|-------------------------------|
| **Hero** | Brand first impression | Headline, subheadline/tagline, primary CTA label, cover image ref (URL placeholder until upload) |
| **About** | Company story | Title, body (markdown or plain text); can default from `business.description` |
| **Services** | What you offer | Show featured services or link to full `/b/<slug>/services` list |
| **Benefits** | Why choose you | 3–6 bullet items (title + short text) |
| **Gallery** | Company photos | Placeholder until media upload; later: ordered image asset refs |
| **Pricing / packages** | Packages or price tiers | Simple cards: name, price text, description, optional CTA link |
| **FAQ** | Common questions | Q&A pairs (question + answer) |
| **Contact / social** | Reach you | Phone, address (from business), email if public-safe, website, Instagram, etc. |
| **Booking / request CTA** | Conversion | Primary/secondary CTAs respecting `operating_mode`; links to existing flows |

**MVP defaults:** Sensible default section set for new Pro businesses; missing section config falls back to current `ProMiniSiteLayout` behavior.

---

## 4. Theme customization (proposed)

Theme applies **globally** to the rendered mini-site — not per-section arbitrary CSS.

| Token | MVP |
|-------|-----|
| **Primary color** | Brand main (buttons, links, accents) |
| **Accent color** | Secondary highlight |
| **Background style** | Preset: light / soft tint / dark (enum, not custom CSS) |
| **Button style** | Preset: solid / outline / rounded (small enum) |
| **Logo** | Ref to logo URL (existing `logo_url` or future asset id) |
| **Cover / hero image** | URL placeholder or asset ref after Media Foundation |

**Important:** Real **image upload** for logo, cover, and gallery waits for **Media Foundation** (Phase 10 Slice 4). Until then, URL fields or disabled placeholders only.

---

## 5. Data model direction

### Recommendation: structured JSON first

Store mini-site configuration as **one structured JSON document** per business (nested in `business.settings` or a dedicated column/table later). Shape (illustrative):

```json
{
  "mini_site": {
    "version": 1,
    "theme": {
      "primary_color": "#2563eb",
      "accent_color": "#7c3aed",
      "background_style": "light",
      "button_style": "solid"
    },
    "sections": [
      {
        "id": "hero",
        "type": "hero",
        "enabled": true,
        "order": 0,
        "content": {
          "headline": "Welcome",
          "tagline": "Quality service you can trust",
          "cover_image_ref": null
        }
      },
      {
        "id": "about",
        "type": "about",
        "enabled": true,
        "order": 1,
        "content": { "title": "About us", "body": "..." }
      }
    ],
    "social_links": {
      "website": "https://example.com",
      "instagram": "https://instagram.com/handle"
    }
  }
}
```

### Principles

- **Theme**, **sections** (type, enabled, order, content), and **social_links** live in config JSON.
- **Media assets** stay **separate** when upload exists (asset ids/refs in section content, not embedded binary).
- Reuse existing business fields where possible (`name`, `description`, `logo_url`, `contact_phone`, `address`) — avoid duplicating unless override is needed.
- Public API exposes a **sanitized DTO** only (no admin settings, Stripe, or internal ids beyond what’s already public).

### Options considered (unchanged rationale)

| Option | Notes |
|--------|--------|
| A — `settings` JSON only | Fastest; good for MVP config blob |
| B — Dedicated table | Better if config grows large or needs versioning |
| C — Hybrid | Core business fields on `businesses` + `settings.mini_site` JSON for builder |

**MVP recommendation:** Start with **Option C** — `settings.mini_site` (or `settings.public_profile` evolved into `mini_site`) with documented schema version.

---

## 6. Editor approach (admin)

### Location

Dedicated **Mini-site editor** — either:

- New admin route (e.g. `/admin/mini-site`), or
- Expanded area linked from Settings / Public profile card.

`PublicProfileSettingsCard` skeleton is the **entry point** until the full editor ships.

### Layout (MVP)

```
┌─────────────────────────────────────────────────────────┐
│  Mini-site editor                                       │
├──────────────────────┬──────────────────────────────────┤
│  Section forms       │  Live preview                    │
│  (left)              │  (right)                         │
│                      │                                  │
│  • Hero              │  Renders current config as       │
│  • About             │  public page would look          │
│  • Services          │  (iframe or inline component)    │
│  • …                 │                                  │
│  Theme colors        │                                  │
│  Enable/disable      │                                  │
│  [Save]              │  [Open public page]              │
└──────────────────────┴──────────────────────────────────┘
```

### MVP editor rules

- **No drag-and-drop** in MVP (section order fixed or by simple up/down later).
- **No freeform canvas** — only forms for each section type.
- **Live preview** updates from draft state (client-side) before save.
- **Save** persists config JSON when backend slice is ready.
- Disabled / coming-soon fields until storage and media exist.

### Future (post-MVP)

- Drag-and-drop **section reordering**
- **Layout variants** per section (e.g. hero with image left vs centered)
- Custom spacing controls — only after core builder is stable

---

## 7. Public rendering approach

### Entry point

- **Keep** `/b/<slug>` as the single public URL.
- Branch on `public_page_variant === "mini_site"` (already implemented).

### Rendering logic (target)

1. Load public business + mini-site config (when available).
2. If **no saved config** or partial config → **safe fallback** to `ProMiniSiteLayout` using existing business/services data.
3. If **saved config** → render **section components** in order; skip disabled sections.
4. Apply **theme tokens** to section wrappers (CSS variables or Tailwind-friendly tokens).
5. **CTA sections** always link to existing book/request/services routes.
6. **Never** expose admin-only fields, subscription objects, or Stripe data.

### Non-Pro businesses

- `public_page_variant === "standard"` → `StandardPublicBusinessHome` (unchanged).

---

## 8. Plan gating approach

| Phase | Behavior |
|-------|----------|
| **Now – Slice 3J** | Soft gating: `mini_site` variant for active Pro only; admin shows Pro / coming-soon labels |
| **Slice 8** | Real plan enforcement (limits, optional blocks) after builder + media are stable |
| **No hard blocks early** | Non-Pro owners keep current admin and public behavior |

---

## 9. Phased implementation slices

| Slice | Deliverable | Notes |
|-------|-------------|--------|
| **3A** ✅ | This plan (initial) | Docs |
| **3B** ✅ | `ProMiniSiteLayout` skeleton | Existing public fields only |
| **3C** ✅ | `public_page_variant` + public wiring | Active Pro → mini-site layout |
| **3D** ✅ | `PublicProfileSettingsCard` skeleton | Disabled fields; no save |
| **3E** | Builder **data model / schema design** | Document JSON shape, validation rules, public DTO; no migrations required in doc-only slice |
| **3F** | Backend **storage** for `mini_site` config JSON | Admin read/write; public sanitized read |
| **3G** | Admin **editor skeleton UI** | Section list + disabled save; no preview yet |
| **3H** | **Live preview** UI | Right panel mirrors public render from draft state |
| **3I** | Public **render saved sections** | Replace/fallback from `ProMiniSiteLayout` to config-driven sections |
| **3J** | **Theme colors** support | Primary/accent/background/button presets on public + editor |
| **4** | **Media Foundation** | Upload, cover, gallery assets; wire refs in hero/gallery |
| **8** | **Plan enforcement** | Feature locks per product decision |

**Dependency order:** 3E (schema) → 3F (storage) → 3G/3H (editor) → 3I (public) → 3J (theme) → 4 (media refs) → 8 (enforcement).

**Section reordering:** After 3I stable; not required for first shippable builder.

---

## 10. Risks and limits

| Risk | Mitigation |
|------|------------|
| Scope creep into full website builder | Fixed section types only; no arbitrary HTML/CSS |
| Broken mobile layouts | Server-defined section templates; responsive by design |
| Storing files before media foundation | URL placeholders only; asset refs after Slice 4 |
| Leaking private data on public page | Strict public DTO; review each new field |
| Hard plan blocks too early | Soft gating until Slice 8 |
| Editor complexity | No drag-and-drop in MVP; forms + preview only |
| Duplicate business data | Prefer overrides in config; default from `businesses` row |
| Testing burden | One renderer for preview and public; shared section components |

---

## 11. Out of scope (MVP and near-term)

- Freeform Webflow/Tilda-style arbitrary div editor
- Custom domains
- Media upload (until Phase 10 Slice 4)
- Real plan enforcement (until Phase 10 Slice 8)
- Analytics, SEO automation, reviews, blog/posts
- Marketplace / discovery
- Stripe, checkout, webhook, or billing portal changes
- Breaking `/b/<slug>/services`, book, or request flows
- Arbitrary per-section CSS or user-supplied HTML blocks

---

## 12. Acceptance criteria (builder MVP complete)

When Slices 3F–3J are done (media upload still optional / placeholder until Slice 4):

- [ ] `/b/<slug>` loads for all businesses; no regression for standard variant.
- [ ] Pro eligible businesses can **save** mini-site config from admin editor.
- [ ] Public page renders **enabled sections** from saved config with theme applied.
- [ ] Missing or invalid config **falls back** safely (no 500).
- [ ] Booking and request flows unchanged.
- [ ] Gallery/cover/logo use placeholders or URLs until Slice 4 upload.
- [ ] Live preview matches public render (same section components).
- [ ] No subscription/Stripe/admin internals on public API.
- [ ] CI green: frontend tests, typecheck, build, API tests.

---

## 13. References (in-repo)

| Topic | Location |
|-------|----------|
| Public home + branching | `web/src/pages/PublicHomePage.tsx` |
| Pro layout skeleton | `web/src/components/public/ProMiniSiteLayout.tsx` |
| Standard layout | `web/src/components/public/StandardPublicBusinessHome.tsx` |
| Public API | `web/src/api/publicApi.ts`, `api/app/schemas/business.py` |
| `public_page_variant` | `api/app/utils/public_page_variant.py` |
| Admin settings | `web/src/pages/admin/AdminSettingsPage.tsx` |
| Public profile skeleton | `web/src/components/admin/PublicProfileSettingsCard.tsx` |
| Plan UI | `CurrentPlanCard`, `PlanFeatureComparison`, `ProToolsComingSoonCard`, `PlanBadge` |

---

## Summary

The Pro mini-site evolves from a **single layout skeleton** into a **section-based mini-site builder**: owners edit structured sections and theme tokens; the public page renders a polished landing page at `/b/<slug>`. Store configuration as **versioned JSON** (`theme`, `sections`, `social_links`, visibility/order); keep **media assets separate** until Media Foundation. Use a **form + live preview** editor — not a freeform canvas. Ship via slices **3E–3J**, then media (Slice 4) and enforcement (Slice 8).
