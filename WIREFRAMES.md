# Service Platform PWA — Wireframes

Text/ASCII wireframes for mobile (375px) and desktop (1280px).  
Notation: `[Button]`, `(input)`, `*` = required, `---` = divider.

---

## Mobile Client

### MC1. Home

```
┌─────────────────────────────────┐
│ ≡                    [Sign in]  │
├─────────────────────────────────┤
│                                 │
│      ┌─────────────────┐        │
│      │     [LOGO]      │        │
│      └─────────────────┘        │
│                                 │
│      Joe's Salon                │
│      Hair · Color · Custom      │
│                                 │
│  ┌───────────────────────────┐  │
│  │  📅 Book appointment      │  │  ← if mode ≠ orders_only
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  📋 Request a service     │  │  ← if mode ≠ booking_only
│  └───────────────────────────┘  │
│                                 │
│  ─── Popular services ───       │
│  ┌─────────────────────────┐  │
│  │ Haircut          30 min │  │
│  │ from $25                │  │
│  └─────────────────────────┘  │
│  ┌─────────────────────────┐  │
│  │ Custom wig order        │  │
│  │ Quote on request        │  │
│  └─────────────────────────┘  │
│                                 │
│  📍 123 Main St · 📞 Call      │
├─────────────────────────────────┤
│ Home   Bookings   Requests  👤  │
└─────────────────────────────────┘
```

---

### MC2. Services List (Booking tab)

```
┌─────────────────────────────────┐
│ ←  Book appointment             │
├─────────────────────────────────┤
│ Choose a service                │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Haircut                     │ │
│ │ 30 min · $25                │ │
│ │ Classic cut and style    →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Hair coloring               │ │
│ │ 90 min · from $80           │ │
│ │ Full color treatment     →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Consultation                │ │
│ │ 15 min · Free               │ │
│ │ Quick style advice       →  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Home   Bookings   Requests  👤  │
└─────────────────────────────────┘
```

---

### MC3. Booking Service Card (Detail)

```
┌─────────────────────────────────┐
│ ←  Haircut                      │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │         [icon/photo]        │ │
│ └─────────────────────────────┘ │
│                                 │
│ Haircut                         │
│ ⏱ 30 minutes  ·  💰 $25        │
│                                 │
│ Professional haircut including  │
│ wash and blow dry.              │
│                                 │
│ ─── Policy ───                  │
│ Cancel free up to 24h before.   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      [ Book now ]           │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### MC4. Order Service Card (Detail)

```
┌─────────────────────────────────┐
│ ←  Custom wig order             │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │         [icon/photo]        │ │
│ └─────────────────────────────┘ │
│                                 │
│ Custom wig order                │
│ 💰 Quote on request             │
│                                 │
│ Describe your requirements and  │
│ we'll respond within 48 hours.  │
│                                 │
│ ─── What's included ───         │
│ · Consultation                  │
│ · Custom fitting                │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    [ Start request ]        │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### MC5. Date Picker

```
┌─────────────────────────────────┐
│ ←  Pick a date                  │
├─────────────────────────────────┤
│ Haircut · 30 min                │
│                                 │
│      ◀  June 2026  ▶            │
│  Mo Tu We Th Fr Sa Su           │
│   1  2  3  4  5  6  7           │
│   8  9 10 11 12 13 14           │
│  15 16 17 18 19 20 21           │
│  22 23 24 [25]26 27 28          │
│  29 30                          │
│                                 │
│  ● Available  ○ Unavailable     │
│                                 │
│ Selected: Wed, Jun 25           │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      [ Continue ]           │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### MC6. Time Picker

```
┌─────────────────────────────────┐
│ ←  Pick a time                  │
├─────────────────────────────────┤
│ Wed, Jun 25 · Haircut           │
│                                 │
│ Morning                         │
│ ┌──────┐ ┌──────┐ ┌──────┐      │
│ │09:00 │ │09:30 │ │10:00 │      │
│ └──────┘ └──────┘ └──────┘      │
│ ┌──────┐ ┌──────┐               │
│ │10:30 │ │11:00 │  (grey=full)  │
│ └──────┘ └──────┘               │
│                                 │
│ Afternoon                       │
│ ┌──────┐ ┌──────┐ ┌──────┐      │
│ │14:00 │ │14:30 │ │15:00 │      │
│ └──────┘ └──────┘ └──────┘      │
│                                 │
│ Selected: 14:30                 │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      [ Continue ]           │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### MC7. Booking Confirmation

```
┌─────────────────────────────────┐
│ ←  Confirm booking              │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Haircut                     │ │
│ │ 📅 Wed, Jun 25, 2026        │ │
│ │ 🕐 14:30 (30 min)           │ │
│ │ 💰 $25.00                   │ │
│ └─────────────────────────────┘ │
│                                 │
│ Notes (optional)                │
│ ┌─────────────────────────────┐ │
│ │(textarea)                   │ │
│ └─────────────────────────────┘ │
│                                 │
│ ─── Your details ───            │
│ Name*    (Joe Client      )     │
│ Phone*   (+1 555 0100     )     │
│ Email*   (joe@email.com   )     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │   [ Pay $25 & confirm ]     │ │  ← or [ Confirm booking ]
│ └─────────────────────────────┘ │
│                                 │
│ By confirming you agree to      │
│ cancellation policy.            │
└─────────────────────────────────┘
```

---

### MC8. Order Details Form

```
┌─────────────────────────────────┐
│ ←  Request details              │
├─────────────────────────────────┤
│ Custom wig order                │
│                                 │
│ Describe what you need *        │
│ ┌─────────────────────────────┐ │
│ │(large textarea)             │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ Reference photo URL (optional)  │
│ (https://...              )     │
│                                 │
│ Preferred contact               │
│ (●) Email  ( ) Phone            │
│                                 │
│ ─── Your details ───            │
│ Name*    (               )      │
│ Phone    (               )      │
│ Email*   (               )      │
│                                 │
│ ┌─────────────────────────────┐ │
│ │     [ Submit request ]      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### MC9. My Bookings

```
┌─────────────────────────────────┐
│  My bookings                    │
├─────────────────────────────────┤
│ [Upcoming] [Past] [Cancelled]   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ● Confirmed                 │ │
│ │ Haircut                     │ │
│ │ Wed Jun 25 · 14:30          │ │
│ │ Joe's Salon              →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ○ Pending                   │ │
│ │ Consultation                │ │
│ │ Fri Jun 27 · 10:00          │ │
│ │ Joe's Salon              →  │ │
│ └─────────────────────────────┘ │
│                                 │
│         (empty state)           │
│    No past bookings yet         │
│                                 │
├─────────────────────────────────┤
│ Home   Bookings   Requests  👤  │
└─────────────────────────────────┘
```

---

### MC10. My Requests

```
┌─────────────────────────────────┐
│  My requests                    │
├─────────────────────────────────┤
│ [Active] [Done] [Declined]      │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ● In progress               │ │
│ │ Custom wig order            │ │
│ │ Submitted Jun 20            │ │
│ │ "Thanks, we're working..."  │ │
│ │                          →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ○ Submitted                 │ │
│ │ Rush repair                 │ │
│ │ Submitted Jun 24            │ │
│ │                          →  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Home   Bookings   Requests  👤  │
└─────────────────────────────────┘
```

---

### MC11. Order Chat

```
┌─────────────────────────────────┐
│ ←  Custom wig order             │
├─────────────────────────────────┤
│ Status: In progress             │
│ Ref: ORD-2026-0042              │
│                                 │
│ ─── Messages ───                │
│                                 │
│        ┌──────────────────┐     │
│        │ You · Jun 20     │     │
│ │ Need lace front,      │     │
│ │ 22 inch, color #4     │     │
│        └──────────────────┘     │
│                                 │
│ ┌──────────────────┐            │
│ │ Joe's Salon      │            │
│ │ Jun 21           │            │
│ │ We can do that.  │            │
│ │ Price will be    │            │
│ │ $320.            │            │
│ └──────────────────┘            │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Type a message...    [Send] │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## Mobile Admin

### MA1. Dashboard

```
┌─────────────────────────────────┐
│ ☰  Joe's Salon        🔔 (3)   │
├─────────────────────────────────┤
│ Good morning, Maria             │
│                                 │
│ ┌──────────┐ ┌──────────┐       │
│ │ Today    │ │ Pending  │       │
│ │    5     │ │ orders 2 │       │
│ │ bookings │ │          │       │
│ └──────────┘ └──────────┘       │
│                                 │
│ ─── Today's schedule ───        │
│ 09:00  Haircut · Anna       ✓   │
│ 10:30  Color · Ben          ●   │
│ 14:00  (open)                   │
│ 14:30  Haircut · Carl       ●   │
│                                 │
│ ─── Needs action ───            │
│ ┌─────────────────────────────┐ │
│ │ NEW ORDER · Rush repair  →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Booking request · 16:00  →  │ │
│ └─────────────────────────────┘ │
│                                 │
│ Plan: Starter · 180/200 bookings│
│ [Upgrade]                       │
├─────────────────────────────────┤
│ Dash  Book  Order  More         │
└─────────────────────────────────┘
```

---

### MA2. Bookings

```
┌─────────────────────────────────┐
│ ←  Bookings          [+ New]    │
├─────────────────────────────────┤
│ (Today ▼)  (All status ▼)  🔍   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 14:30 · Confirmed           │ │
│ │ Haircut · Carl Lee          │ │
│ │ +1 555 0199                 │ │
│ │ [Complete] [Cancel]      →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 16:00 · Pending             │ │
│ │ Consultation · Dana         │ │
│ │ [Confirm] [Cancel]       →  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Dash  Book  Order  More         │
└─────────────────────────────────┘
```

---

### MA3. Orders

```
┌─────────────────────────────────┐
│ ←  Orders                       │
├─────────────────────────────────┤
│ [Pending] [Active] [Done]       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ● Submitted · 2h ago        │ │
│ │ Rush repair                 │ │
│ │ Evan Park                   │ │
│ │ [Accept] [Decline]       →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ● In progress               │ │
│ │ Custom wig · Fiona          │ │
│ │ 💬 1 new message         →  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Dash  Book  Order  More         │
└─────────────────────────────────┘
```

---

### MA4. Services

```
┌─────────────────────────────────┐
│ ←  Services          [+ Add]    │
├─────────────────────────────────┤
│ [All] [Booking] [Order]         │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Haircut          BOOKING    │ │
│ │ 30m · $25 · Active       ✎  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Custom wig       ORDER      │ │
│ │ Quote · Active           ✎  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Consultation     BOOKING    │ │
│ │ 15m · Free · Inactive    ✎  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Dash  Book  Order  More         │
└─────────────────────────────────┘
```

---

### MA5. Clients

```
┌─────────────────────────────────┐
│ ←  Clients                      │
├─────────────────────────────────┤
│ 🔍 Search name, phone, email    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Carl Lee                    │ │
│ │ carl@email.com · 3 visits   │ │
│ │                          →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Dana Smith                  │ │
│ │ +1 555 0122 · 1 order       │ │
│ │                          →  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Dash  Book  Order  More         │
└─────────────────────────────────┘
```

---

### MA6. Payments

```
┌─────────────────────────────────┐
│ ←  Payments                     │
├─────────────────────────────────┤
│ (This month ▼)  (All ▼)         │
│                                 │
│ Total: $1,240.00                │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Jun 24 · $25.00  Succeeded  │ │
│ │ Haircut · Carl Lee          │ │
│ │ Booking #1042            →  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Jun 22 · $80.00  Succeeded  │ │
│ │ Color · Ben Fox             │ │
│ │ Booking #1038            →  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Dash  Book  Order  More         │
└─────────────────────────────────┘
```

---

### MA7. Settings

```
┌─────────────────────────────────┐
│ ←  Settings                     │
├─────────────────────────────────┤
│ Business profile            →   │
│ Operating mode              →   │
│ Booking policies            →   │
│ Schedule & hours            →   │
│ Payments (Stripe)           →   │
│ Notifications               →   │
│ Team members (post-MVP)     →   │
│ Plan & billing              →   │
│ ─────────────────────────────   │
│ Account & password          →   │
│ Sign out                        │
└─────────────────────────────────┘
```

---

## Desktop Admin

### DA1. Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Service Platform     Joe's Salon ▼              🔔  Maria ▼            │
├────────────┬─────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│ Dashboard  │  Dashboard                                    Jun 25, 2026       │
│ Bookings   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│ Orders     │  │ Today      │ │ Pending    │ │ Revenue    │ │ New clients│   │
│ Services   │  │ 5 bookings │ │ 2 orders   │ │ $340 MTD   │ │ 3 this week│   │
│ Clients    │  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│ Payments   │                                                                 │
│ Schedule   │  ┌─────────────────────────────┬─────────────────────────────┐   │
│ Settings   │  │ Today's schedule            │ Needs attention             │   │
│            │  │ 09:00 Haircut Anna      ✓   │ ● Rush repair (submitted)   │   │
│            │  │ 10:30 Color Ben         ●   │ ● Pending booking 16:00     │   │
│            │  │ 14:30 Haircut Carl      ●   │                             │   │
│            │  │                             │ [View all orders]           │   │
│            │  └─────────────────────────────┴─────────────────────────────┘   │
│            │                                                                 │
│            │  ┌──────────────────────────────────────────────────────────┐  │
│            │  │ Usage: Starter plan · 180/200 bookings · [Upgrade plan]  │  │
│            │  └──────────────────────────────────────────────────────────┘  │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

---

### DA2. Services Table

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Services                                                    [+ Add service]  │
├──────────────────────────────────────────────────────────────────────────────┤
│ [All types ▼] [Active ▼]  🔍 Search...                                       │
├──────────┬──────────┬──────────┬─────────┬──────────┬─────────┬──────────────┤
│ Name     │ Type     │ Duration │ Price   │ Payment  │ Status  │ Actions      │
├──────────┼──────────┼──────────┼─────────┼──────────┼─────────┼──────────────┤
│ Haircut  │ Booking  │ 30 min   │ $25     │ Required │ Active  │ Edit · ⋮     │
│ Color    │ Booking  │ 90 min   │ $80     │ Required │ Active  │ Edit · ⋮     │
│ Wig order│ Order    │ —        │ Quote   │ Optional │ Active  │ Edit · ⋮     │
│ Consult  │ Booking  │ 15 min   │ Free    │ —        │ Inactive│ Edit · ⋮     │
└──────────┴──────────┴──────────┴─────────┴──────────┴─────────┴──────────────┘
```

---

### DA3. Bookings Table

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Bookings                                              [+ Create booking]     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Date range: [Jun 1] – [Jun 30]   Status: [All ▼]   🔍 Client search          │
├──────────┬────────────┬──────────┬──────────┬──────────┬─────────┬───────────┤
│ Date     │ Time       │ Service  │ Client   │ Phone    │ Status  │ Actions   │
├──────────┼────────────┼──────────┼──────────┼──────────┼─────────┼───────────┤
│ Jun 25   │ 14:30      │ Haircut  │ Carl Lee │ 555-0199 │ Confirm │ View · ⋮  │
│ Jun 25   │ 16:00      │ Consult  │ Dana     │ 555-0122 │ Pending │ Confirm   │
│ Jun 24   │ 10:00      │ Color    │ Ben Fox  │ 555-0101 │ Complete│ View      │
└──────────┴────────────┴──────────┴──────────┴──────────┴─────────┴───────────┘
                                              ◀ 1 2 3 ▶                          │
```

---

### DA4. Orders Table

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Orders                                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Status: [All ▼]   🔍 Search...                                               │
├──────────┬─────────────────┬──────────┬────────────┬────────────┬────────────┤
│ Ref      │ Service         │ Client   │ Submitted  │ Status     │ Actions    │
├──────────┼─────────────────┼──────────┼────────────┼────────────┼────────────┤
│ ORD-0042 │ Custom wig      │ Fiona    │ Jun 20     │ In progress│ View · ⋮   │
│ ORD-0045 │ Rush repair     │ Evan     │ Jun 24     │ Submitted  │ Accept     │
│ ORD-0038 │ Alterations     │ Grace    │ Jun 10     │ Completed  │ View       │
└──────────┴─────────────────┴──────────┴────────────┴────────────┴────────────┘
```

---

### DA5. Clients Table

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Clients                                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search name, email, phone                              [Export CSV] (plan)│
├──────────────────┬─────────────────┬──────────┬───────────┬────────────────┤
│ Name             │ Email           │ Phone    │ Last visit│ Total activity │
├──────────────────┼─────────────────┼──────────┼───────────┼────────────────┤
│ Carl Lee         │ carl@email.com  │ 555-0199 │ Jun 25    │ 3 bookings     │
│ Dana Smith       │ dana@email.com  │ 555-0122 │ Jun 20    │ 1 order        │
│ Evan Park        │ evan@email.com  │ 555-0188 │ Jun 24    │ 2 orders       │
└──────────────────┴─────────────────┴──────────┴───────────┴────────────────┘
```

---

### DA6. Payments Table

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Payments                                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Period: [This month ▼]   Status: [All ▼]          Total: $1,240.00           │
├──────────┬─────────┬──────────┬──────────┬─────────────┬─────────┬────────────┤
│ Date     │ Amount  │ Client   │ Type     │ Linked to   │ Status  │ Stripe ID  │
├──────────┼─────────┼──────────┼──────────┼─────────────┼─────────┼────────────┤
│ Jun 24   │ $25.00  │ Carl Lee │ Full     │ BKG-1042    │ Success │ pi_xxx…    │
│ Jun 22   │ $80.00  │ Ben Fox  │ Full     │ BKG-1038    │ Success │ pi_yyy…    │
│ Jun 20   │ $50.00  │ Fiona    │ Deposit  │ ORD-0042    │ Pending │ pi_zzz…    │
└──────────┴─────────┴──────────┴──────────┴─────────────┴─────────┴────────────┘
```

---

### DA7. Schedule Page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Schedule & availability                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Working hours                          Unavailable periods  [+ Add block] │
│  ┌────────┬──────────┬──────────┐      ┌────────────────────────────────┐│
│  │ Day    │ Open     │ Close    │      │ Jul 1–7, 2026  Vacation        ││
│  ├────────┼──────────┼──────────┤      │ Dec 25, 2025   Holiday         ││
│  │ Mon    │ 09:00    │ 18:00    │      └────────────────────────────────┘│
│  │ Tue    │ 09:00    │ 18:00    │                                          │
│  │ Wed    │ 09:00    │ 18:00    │      Breaks (daily)                      │
│  │ Thu    │ 09:00    │ 18:00    │      ┌────────┬──────────┬──────────┐    │
│  │ Fri    │ 09:00    │ 18:00    │      │ Label  │ Start    │ End      │    │
│  │ Sat    │ 10:00    │ 16:00    │      ├────────┼──────────┼──────────┤    │
│  │ Sun    │ Closed   │ —        │      │ Lunch  │ 13:00    │ 14:00    │    │
│  └────────┴──────────┴──────────┘      └────────┴──────────┴──────────┘    │
│                                                                              │
│  Slot interval: [30 min ▼]   Buffer between bookings: [0 min ▼]            │
│                                                                              │
│                                              [ Save changes ]                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### DA8. Settings Page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                                     │
├──────────────────┬───────────────────────────────────────────────────────────┤
│ Business profile │  Business name:  [ Joe's Salon                    ]       │
│ Operating mode   │  URL slug:       [ joes-salon ]  app.../b/joes-salon      │
│ Booking policies │  Description:    [textarea]                             │
│ Payments         │  Logo: [Upload]                                         │
│ Notifications    │                                                         │
│ Team             │  ─── Operating mode ───                                 │
│ Plan & billing   │  (●) Both bookings and orders                           │
│ Account          │  ( ) Bookings only                                      │
│                  │  ( ) Orders only                                        │
│                  │                                                         │
│                  │  ─── Booking policies ───                               │
│                  │  [✓] Auto-confirm bookings                              │
│                  │  Cancel window: [24] hours before                       │
│                  │  Max advance booking: [60] days                         │
│                  │                                                         │
│                  │                                    [ Save ]             │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

---

## Responsive Notes

| Screen | Nav pattern | Tables |
|--------|-------------|--------|
| &lt; 768px | Bottom tab bar (client/admin) | Card lists |
| ≥ 768px | Side nav (admin) | Responsive tables |
| ≥ 1280px | Fixed sidebar 240px | Full tables + filters |

## Component Library (Implementation Hint)

Reuse across wireframes:
- `StatusBadge` — color-coded booking/order status
- `ServiceCard` — booking vs order variant
- `SlotGrid` — time picker cells
- `MessageThread` — shared client/admin
- `EmptyState` — illustration + CTA
- `UsageBanner` — plan limits
