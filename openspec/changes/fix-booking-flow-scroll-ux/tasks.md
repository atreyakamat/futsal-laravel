## 1. Desktop checkout CTA reachability

- [x] 1.1 In `components/BookingSystem.tsx`, change the fixed bottom action bar (currently `lg:hidden`, lines ~329-348) to render at all breakpoints while `selectedSlots.length > 0`, keeping its existing `handleProceed()` wiring, loading state, and safe-area padding. Verify by inspecting the rendered DOM at a desktop viewport width (≥1024px) with a slot selected — the bar should be present and fixed to the viewport bottom.
- [x] 1.2 Adjust layout spacing so the fixed bar doesn't overlap the sidebar's own CTA or page footer content at desktop widths (the grid's existing `pb-24 lg:pb-0` bottom padding on the slots column was sized for mobile-only; revisit for the now-shared bar). Verify by checking no interactive element is visually obscured by the fixed bar at desktop width with a slot selected.
- [x] 1.3 Manually verify end-to-end at desktop width: scroll down through the slot grid, select a slot far below the fold, confirm the checkout/login CTA is visible without scrolling back up, and that clicking it still navigates correctly (to `/login?next=...` when logged out, to `/booking/checkout` when logged in).

## 2. Arena page scroll cue

- [x] 2.1 In `app/arena/[slug]/page.tsx`, add a scroll-down affordance (small bouncing chevron/icon, consistent with the codebase's existing `animate-bounce` usage) anchored to the bottom of the hero `<section>` (~line 89-154), pointing toward the booking section below.
- [x] 2.2 Ensure the cue doesn't overlap the existing hero content (arena name, address, price card) at both mobile and desktop hero heights (`h-[45vh] sm:h-[50vh]`). Verify visually at both a mobile and a desktop viewport width.

## 3. Homepage arena-list scroll target

- [x] 3.1 In `app/page.tsx`, add `scroll-margin-top` sized to the sticky header's height (80px / `scroll-mt-20`) to the `<div id="arenas">` target (~line 74). Verify by clicking "Explore Arenas" and confirming the section heading is not hidden beneath the sticky header.
- [x] 3.2 In `components/ArenaGrid.tsx`, reduce the card image height on mobile only (`h-80` → e.g. `h-48 md:h-80`, ~line 58), preserving current desktop appearance. Verify the card renders correctly at both a mobile and a desktop viewport width with no layout shift/overflow.
- [x] 3.3 Manually verify end-to-end on a mobile-width viewport: tap "Explore Arenas" from the homepage hero, confirm the first arena card's name is fully visible without an additional manual scroll.

## 4. Regression check

- [x] 4.1 Run the existing test suite (`npx vitest run --pool=forks`) and confirm no existing tests broke from the layout changes.
- [x] 4.2 Manually re-verify the pre-existing mobile sticky bottom bar behavior on the booking page still works unchanged (this change only removes its `lg:hidden` restriction, not its logic).
