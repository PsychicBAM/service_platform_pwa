# Service Platform PWA — Project Handoff for Cursor

This document is for a **new Cursor account/agent** continuing work on this repository. Read it before making changes.

**Project path:** `E:\generated_apps\service_platform_pwa`

---

## 1. Project overview

### Product

SaaS/PWA platform for businesses. Businesses get an admin area to manage services, bookings, clients, and a public-facing page. Pro plans include a configurable **mini-site builder** (templates, sections, media, copy).

### Main features (current / planned)

| Area | Status |
|------|--------|
| Business admin | Active |
| Services (booking + order/request types) | Active |
| Bookings | Active |
| Requests/orders | Active |
| Clients | Active |
| Public business pages (`/b/:slug`) | Active |
| Pro mini-site builder | Active (7 templates) |
| Superadmin | Partial |
| Marketplace/directory | Planned |

### Stack

**Frontend** (`web/`)

- React 18
- Vite 8
- TypeScript
- Tailwind CSS 3
- React Router, TanStack Query
- Vitest + Testing Library (unit)
- Playwright (e2e — run only when user asks)

**Backend** (`api/`)

- FastAPI
- SQLAlchemy (async)
- Alembic migrations
- PostgreSQL 16
- Pillow (image optimization)

**Infrastructure**

- Docker Compose: `postgres`, `api`, `web` (nginx serving built SPA)
- Uploads on disk: `data/uploads/mini_site/...` (volume-mounted, **not in git**)

---

## 2. User workflow preferences

- **User speaks Russian** in chat; **prompts and code comments for agents should be in English** unless the user asks otherwise.
- Work in **small, safe slices** — one template, one feature, one bug at a time.
- **Do not run long/full test suites** unless the user asks. Use the quick checks in §4.
- **Do not push** unless the user explicitly says so.
- After coding tasks, **commit** with a clear message (when the user asks for a commit or deliverables include commit).
- Always end with a **short summary**: files changed, what was preserved, which checks ran and results.

### Visual / template work rules

- **One template at a time** — do not touch Clean while working on Clinic, etc.
- Use a **concrete reference URL and/or screenshots** — structural redesign, not vague “polish.”
- **Do not copy** Nicepage (or any reference) code, CSS, class names, assets, or exact text — structure and visual direction only.
- **No external images** in templates — use uploaded media slots only.
- User often wants to **see screenshots before push** for template work.

---

## 3. Important git safety

### Before any push

```powershell
cd E:\generated_apps\service_platform_pwa
git status
git log --oneline -5
```

### Never commit

| Path / pattern | Reason |
|----------------|--------|
| `.env`, `.env.production` | Secrets |
| `web/.env`, `web/.env.local` | Secrets |
| `data/uploads/` | User-uploaded media |
| `*.db`, `*.sqlite` | Local DB files |
| `web/node_modules/` | Dependencies |
| `web/dist/` | Build output |
| `web/playwright-report/`, `web/test-results/` | E2E artifacts |
| `.venv/`, `__pycache__/`, `.pytest_cache/` | Tooling cache |

### General git rules

- User may have **unpushed commits** — always `git status` + `git log` first.
- **Do not** `git reset --hard` unless user explicitly asks and understands data loss.
- **Do not** force push, especially to `main`.
- Do not change `git config`.

---

## 4. Quick check commands

Use these for mini-site / template / media work. **Do not run e2e** unless user asks.

### Standard frontend quick checks

```powershell
cd E:\generated_apps\service_platform_pwa\web
npm run test -- src/test/mini-site-video.test.ts src/test/public-profile-settings-card.test.tsx src/test/pro-mini-site-layout.test.tsx
npm run typecheck
```

### Backend / Docker quick checks

```powershell
cd E:\generated_apps\service_platform_pwa
docker compose up -d --build api web
docker compose exec -T api python -m pytest tests/test_mini_site_video.py tests/test_mini_site_config.py -q
```

### Public page smoke / duplicate CTA test id issues

If `public-pages.test.tsx` fails (e.g. multiple `pro-mini-site-book-cta`):

```powershell
cd E:\generated_apps\service_platform_pwa\web
npm run test -- src/test/public-pages.test.tsx src/test/pro-mini-site-layout.test.tsx src/test/public-profile-settings-card.test.tsx
npm run typecheck
```

**Reminder:** No push unless user says so.

---

## 5. Mini-site builder current state

### Public business link features

- Public URL per business slug
- Copy/share link in admin
- QR code generation (`qrcode.react`)
- Stable QR URL for the public mini-site page

### Mini-site config

Stored in business settings (JSON), normalized on read/write.

- Template selection (`clean`, `service`, `expert`, `clinic`, `portfolio`, `teacher`, `coach`)
- Theme: primary/accent colors, background style, button style
- **Sections**: enable/disable, order, per-section title/body
- **Copy**: hero badge, CTAs, benefits, trust cards, FAQ, etc.
- **Template media**: per-template image/video slots
- **FAQ empty hiding** — empty FAQ items not rendered
- **CTA/contact/social empty hiding** — missing fields not shown
- **Active Pro** businesses: full mini-site layout on public page
- **Non-Pro**: standard public page (not full template shell)

### Templates (7)

| Template | Primary file |
|----------|----------------|
| `clean` | `web/src/components/public/CleanProMiniSiteSections.tsx` |
| `service` | `web/src/components/public/ServiceProMiniSiteSections.tsx` |
| `expert` | `web/src/components/public/ExpertProMiniSiteSections.tsx` |
| `clinic` | `web/src/components/public/ClinicProMiniSiteSections.tsx` |
| `portfolio` | `web/src/components/public/PortfolioProMiniSiteSections.tsx` |
| `teacher` | `web/src/components/public/TeacherProMiniSiteSections.tsx` |
| `coach` | `web/src/components/public/CoachProMiniSiteSections.tsx` |

**Orchestration:** `web/src/components/public/ProMiniSiteLayout.tsx`  
**Admin preview:** `web/src/components/admin/MiniSiteLivePreview.tsx`

---

## 6. Media upload system

- **Real direct image upload** (multipart), not URL-only for images.
- **12 MB** max upload size (backend validation + nginx `client_max_body_size`).
- Types: **JPG, PNG, WebP**.
- UI shows helper text about limits/formats.
- Files stored under `data/uploads/mini_site/{business_id}/...`
- **Never commit** `data/uploads/`.
- Backend validates size/MIME; storage service handles paths and cleanup on replace/delete.

---

## 7. Image optimization

- **Pillow** optimizes uploads server-side.
- Output: **WebP** (+ thumbnail WebP).
- Public image max width ~**1600px**.
- Thumbnail ~**400px** for admin compact tiles.
- Public/preview use optimized `url`; admin uses `thumbnailUrl` where available.
- Legacy records with only `url` still work.
- Remove/replace deletes owned files safely.
- **No binary image data in DB** — metadata + paths only.

Key backend: `api/app/services/mini_site_image_optimizer.py`, `api/app/services/mini_site_media_storage.py`

---

## 8. Video URL/embed system

- **YouTube and Vimeo URLs only** — no video file upload.
- No FFmpeg, S3, Cloudinary, or arbitrary iframe HTML.
- No `dangerouslySetInnerHTML` for embeds.
- URLs normalized to safe embed endpoints (YouTube may use `youtube-nocookie.com`).
- **CSP** in `web/nginx.conf` allows `frame-src` for YouTube / youtube-nocookie / Vimeo player.
- Public templates use **compact click-to-play** for intro/showreel videos (not huge raw iframes by default).
- Admin Media editor shows status text (“YouTube link added”), not large iframe previews.

Key files:

- `web/src/lib/miniSiteVideo.ts`
- `web/src/components/public/MiniSiteVideoEmbed.tsx`
- `api/app/utils/mini_site_video.py`

---

## 9. Compact admin Media editor

Location: `web/src/components/admin/MiniSiteTemplateMediaSection.tsx` (used from public profile / mini-site settings).

Design constraints (**do not regress**):

- **Compact** — no large thumbnails or iframe blocks in the slot list.
- Status tiles: **No file** / filename / **Image added** / **YouTube link added** / **Vimeo link added**.
- Full URL input only when user clicks **Add/Edit link**.
- **No “Template blocks” panel** — removed intentionally; tests assert it stays gone.

---

## 10. Template media slots

Exact slot IDs per template (image unless noted):

### Clean

- `heroImage`
- `servicesImage`
- `ctaImage`
- `introVideo`

### Service

- `heroImage`
- `serviceImage`
- `requestImage`
- `introVideo`

### Expert

- `profileImage`
- `heroImage`
- `servicesImage`
- `bookingImage`
- `introVideo`

### Clinic

- `heroImage`
- `doctorOrClinicImage`
- `servicesImage`
- `appointmentImage`
- `introVideo`

### Portfolio

- `heroVisual`
- `featuredWorkImage`
- `servicesImage`
- `collaborationImage`
- `showreelVideo`

### Teacher

- `courseImage`
- `lessonPreviewImage`
- `servicesImage`
- `bookingImage`
- `introVideo`
- `lessonPreviewVideo`

### Coach

- `heroImage`
- `programImage`
- `servicesImage`
- `bookingImage`
- `introVideo`

Registry/helpers: `api/app/utils/mini_site_media_slots.py`, `web/src/lib/miniSiteMedia.ts`, template editor registry tests.

---

## 11. Template status

### Clean — **accepted / CI green**

- Reference (inspiration only): [Pristine Shine](https://nicepage.com/website-templates/preview/pristine-shine-6400935)
- Direction: service/cleaning landing — light hero, blue services band, overlapping service cards, trust/stats, compact intro video, CTA.
- **Do not redo** unless user provides a new reference and explicitly asks.

### Clinic — **accepted / CI green**

- Reference: [Welcome to Dental Studios](https://nicepage.com/website-templates/preview/welcome-to-dental-studios-6216588)
- Direction: healthcare/dental — white hero, **coral services band**, treatment cards, doctor trust, new patients block, contact cards, FAQ.
- **Do not redo** unless user asks.

### Portfolio — **accepted / CI green**

- Reference: [Creative immersive design](https://nicepage.com/website-templates/preview/creative-immersive-and-breathtaking-design-5864845)
- Direction: creative studio — colorful hero, What We Do, lavender portfolio grid, showreel click-to-play, Start Today CTA.
- **Test id rule:** only **hero** primary CTA uses `data-testid="pro-mini-site-book-cta"`. Non-hero Portfolio CTAs use unique ids (e.g. `pro-mini-site-portfolio-contact-cta`, `pro-mini-site-portfolio-request-cta`).
- **Do not redo** unless user asks.

### Expert — **accepted / closed / CI green**

- Reference: [We are experts in business solutions](https://nicepage.com/website-templates/preview/we-are-experts-in-business-solutions-1287209)
- Direction: consultant landing — light hero + profile image, 4 expertise cards, authority accent band, services split, 01/02/03 process cards, problem-solving list, about/proof, booking CTA.
- Rebuild commit: `f8756e9`. **User confirmed acceptable (closed).**
- **Do not redo** unless user provides a new reference and explicitly asks.

### Service — **acceptable**

- Do not touch unless user asks.

### Coach — **acceptable foundation (~7/10)**

- Do not touch unless user asks.

### Teacher — **problematic / not final**

- Multiple past attempts made it worse.
- **Do not** randomly polish Teacher.
- Redesign only after user supplies a **strong education/course reference** (URL + screenshots).
- Avoid: tiny random media fragments, huge media before cards, dead tiny video cards, scattered course images.

---

## 12. Recent template-work lessons

### Do NOT

- Touch all templates at once.
- Broad refactors during visual work.
- Redesign without concrete reference screenshots/URL.
- Copy external template code, CSS, class names, or assets.
- Change backend/API/media schema during **visual-only** template tasks.
- Break compact admin Media editor or bring back huge previews / Template blocks panel.
- Add video upload, S3, Cloudinary, or FFmpeg.
- Commit `data/uploads/` or env files.
- Render videos as huge raw YouTube blocks by default.
- Place media as random fragments between sections.
- Use `servicesImage` as a fake service card unless intentionally designed.
- Cause vertical letter-by-letter heading wrap (`break-all` on headings).
- Show empty public placeholders when media is missing.
- Duplicate generic test ids (e.g. two `pro-mini-site-book-cta` on one page).
- Push without user approval.

### Typical safe scope for template rebuild

- **Only** `web/src/components/public/{Template}ProMiniSiteSections.tsx`
- Touch `ProMiniSiteLayout.tsx` / `MiniSiteLivePreview.tsx` **only** if TypeScript requires new props.
- Preserve `data-testid` values tests rely on (grep tests before renaming).

---

## 13. Current roadmap / unfinished product features

### Per-service images (high interest)

User wants **each service** in admin service management to have its own photo.

- Today: one shared `servicesImage` per template.
- Future: upload per service, optimize like mini-site images, show on public service cards, fallback to template image or text-only card.
- Later: media on orders/requests.

### Booking/scheduling

- Group bookings / group classes
- Capacity per slot
- Booking windows / availability
- Booking cutoff
- Waitlist

### Reviews

- Post-completion reviews/ratings
- Display on public business page
- Future marketplace ranking input

### Marketplace

- Public directory (`/businesses` or `/marketplace`)
- Search, filters (category, city, rating, type)
- Business cards linking to public pages

### Map/location

- Business map, geocoding
- Near me / radius / city search
- Address + coordinates fields

### Promo codes

- Business client discounts
- Pro-tier promo features
- Superadmin promos for plans/subscriptions

### Superadmin

- Stronger dashboard
- Businesses, plans, promos, stats, subscriptions, support tools

### Analytics

- Richer charts: bookings, orders, clients, revenue
- Possible Pro-gated feature

---

## 14. Important files to know

### Frontend — mini-site core

| File | Role |
|------|------|
| `web/src/components/public/ProMiniSiteLayout.tsx` | Public Pro layout, section routing per template |
| `web/src/components/admin/MiniSiteLivePreview.tsx` | Admin live preview per template |
| `web/src/components/admin/MiniSiteTemplateMediaSection.tsx` | Compact media upload/video URL UI |
| `web/src/components/admin/MiniSiteEditorCard.tsx` | Mini-site settings editor shell |
| `web/src/lib/miniSiteConfig.ts` | Config normalization, copy defaults |
| `web/src/lib/miniSiteMedia.ts` | Media types, URL resolution |
| `web/src/lib/miniSiteVideo.ts` | Video URL parse/normalize |
| `web/src/api/miniSiteApi.ts` | API client for config + media |

### Frontend — template section files

- `web/src/components/public/CleanProMiniSiteSections.tsx`
- `web/src/components/public/ClinicProMiniSiteSections.tsx`
- `web/src/components/public/PortfolioProMiniSiteSections.tsx`
- `web/src/components/public/ExpertProMiniSiteSections.tsx`
- `web/src/components/public/ServiceProMiniSiteSections.tsx`
- `web/src/components/public/TeacherProMiniSiteSections.tsx`
- `web/src/components/public/CoachProMiniSiteSections.tsx`

### Frontend — shared public media

- `web/src/components/public/MiniSiteSlotImage.tsx`
- `web/src/components/public/MiniSiteVideoEmbed.tsx`
- `web/src/components/public/MiniSiteSectionAccentImage.tsx`
- `web/src/components/public/MiniSiteTemplateMediaPresentation.tsx`

### Backend — mini-site / media

| File | Role |
|------|------|
| `api/app/utils/mini_site_config.py` | Config merge/normalize |
| `api/app/utils/mini_site_media_slots.py` | Slot definitions per template |
| `api/app/utils/mini_site_video.py` | Video URL validation/normalize |
| `api/app/services/mini_site_image_optimizer.py` | Pillow WebP + thumbnail |
| `api/app/services/mini_site_media_storage.py` | Disk paths, delete on replace |
| `api/app/schemas/mini_site.py` | Pydantic config schemas |
| `api/app/schemas/mini_site_media.py` | Media metadata schemas |
| `api/app/routers/businesses.py` | Business settings, mini-site, upload routes |

### Tests (quick + smoke)

| File | Focus |
|------|--------|
| `web/src/test/mini-site-video.test.ts` | Video URL + embed safety |
| `web/src/test/public-profile-settings-card.test.tsx` | Admin editor, preview, media slots |
| `web/src/test/pro-mini-site-layout.test.tsx` | Template layout, test ids, sections |
| `web/src/test/public-pages.test.tsx` | Public page smoke, CTA uniqueness |
| `api/tests/test_mini_site_config.py` | Backend config |
| `api/tests/test_mini_site_video.py` | Backend video normalize |

### Infra

- `docker-compose.yml` — postgres, api, web
- `web/nginx.conf` — CSP, upload size, static SPA
- `api/requirements.txt` — Python deps (incl. Pillow)

---

## 15. How the next Cursor should start

When opening this project:

1. **Read this file first.**
2. Run (read-only):
   ```powershell
   cd E:\generated_apps\service_platform_pwa
   git status
   git log --oneline -10
   ```
3. **Do not code yet.**
4. Summarize to the user:
   - Which templates are **accepted** vs **open** (§11)
   - Whether there are **unpushed commits** or a dirty tree
   - What the user’s last task likely was (from `git log`)
   - The **safest next slice** (§16)
5. **Ask the user** what to do next before editing files.

---

## 16. Current safest next steps

| Area | Guidance |
|------|----------|
| Clean / Clinic / Portfolio | **Do not touch** unless user explicitly asks with a new reference. |
| Expert | **Accepted / closed** — do not touch unless user explicitly asks with a new reference. |
| Teacher | **Wait** for strong education/course reference; do not ad-hoc polish. |
| Service / Coach | Stable enough; leave alone unless user asks. |
| Product — per-service images | Logical next **product** slice (admin service CRUD + public cards). |
| Template work | Always: one template, reference URL + screenshots, scope limited to `*ProMiniSiteSections.tsx`, quick checks in §4, commit when asked, **no push** unless asked. |

---

## Appendix: Recent git history (snapshot)

As of handoff creation, recent commits on `main` included:

```
f8756e9 Rebuild Expert Pro template with business solutions-inspired layout.
1fd4d9e Fix duplicate Portfolio book CTA test id for public-pages smoke test.
a39315f Polish Portfolio Pro template alignment and grid consistency.
7f60d2a Rebuild Portfolio Pro template with creative studio-inspired layout.
bf2b7db Rebuild Clinic Pro template with Dental Studios-inspired healthcare layout.
8d6e31a Rebuild Clean Pro template to Pristine Shine-inspired service landing structure.
```

Re-run `git log --oneline -10` for the live state.

---

*End of handoff document.*
