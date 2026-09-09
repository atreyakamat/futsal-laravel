## Why

Pre-launch UX testing surfaced three scroll/navigation problems in the arena-discovery-to-checkout path: the desktop checkout CTA isn't reliably reachable after picking a slot, the arena page gives no cue that booking controls are below the fold, and the mobile homepage's "Explore Arenas" jump leaves the arena name clipped off-screen. None of these are functional bugs — booking, locking, and payment all still work — but each one adds friction or confusion right at the point a visitor is deciding whether to book, which matters more than usual with a real launch imminent.

## What Changes

- **Desktop checkout CTA reachability** (`components/BookingSystem.tsx`): the existing `lg:col-span-4` sidebar already uses `position: sticky`, but real-device testing shows the "Proceed to Checkout" action isn't consistently reachable without scrolling back up after picking a slot. Extend the same fixed bottom action bar already used on mobile (currently `lg:hidden`, lines 329-348) to desktop as well, so the CTA is pinned to the viewport — not scroll-position-dependent — the moment a slot is selected, on every breakpoint. The sticky sidebar itself stays as a secondary, always-visible summary; the fixed bar becomes the guaranteed action point.
- **Scroll affordance on the arena page** (`app/arena/[slug]/page.tsx`): the hero section gives no indication that slot selection is below the fold. Add a subtle animated scroll-down cue at the bottom of the hero section, hinting toward the booking section.
- **Homepage "Explore Arenas" scroll target** (`app/page.tsx`, `components/ArenaGrid.tsx`): the `#arenas` anchor link scrolls the `<div id="arenas">` flush to the viewport top, but (a) it doesn't account for the `sticky top-0` 80px header (`components/Header.tsx`), which overlaps the top of whatever scrolls into place, and (b) the section spends ~80px section padding + ~150-180px heading/search bar + 64px gap + a 320px-tall (`h-80`) card image before the first arena's name appears — comfortably exceeding a typical mobile viewport before any identifying text is visible. Fix both: add `scroll-margin-top` sized to the header height on the `#arenas` target so anchor scrolls (this one and any future one) land below the sticky header instead of under it, and reduce the card image height on mobile specifically so the arena name is reachable within one viewport after the jump.

## Capabilities

### New Capabilities
- `booking-flow-ux`: user-facing scroll/navigation behavior across the arena-discovery → slot-selection → checkout path — the checkout action must stay reachable after slot selection, the arena page must cue that booking controls are below the fold, and the homepage's arena-list jump must land on a fully visible arena card.

### Modified Capabilities
(none — no booking, payment, pricing, or admin requirement changes)

## Impact

- `components/BookingSystem.tsx` — add a fixed bottom action bar at all breakpoints (currently mobile-only).
- `app/arena/[slug]/page.tsx` — add scroll-down cue to the hero section.
- `app/page.tsx` — `#arenas` anchor target needs `scroll-margin-top`.
- `components/ArenaGrid.tsx` — reduce card image height on mobile (`h-80` → responsive).
- No database, API, or payment-flow changes. Purely presentational/interaction — no existing capability's requirements change.
