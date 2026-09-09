## Context

`components/BookingSystem.tsx` already has two checkout entry points: a `lg:hidden` fixed bottom bar (mobile, lines 329-348) and a `hidden lg:block` `sticky top-28` sidebar (desktop, lines 662-725). The sidebar's sticky offset (112px) already clears the site's `sticky top-0` header (`components/Header.tsx`, 80px tall) — no z-index or overlap conflict was found by inspection, and no `overflow` ancestor breaks the sticky containing block either. Despite that, real-device testing (user report + screenshot) shows the desktop CTA isn't reliably reachable after selecting a slot without scrolling back up. Rather than chase an elusive sticky-CSS edge case (viewport height, browser zoom, and OS chrome all affect sticky behavior in ways that are hard to reproduce from static code review alone), this design uses the pattern that's already proven to work: the mobile fixed bottom bar, pinned to the viewport rather than the scroll position.

`app/page.tsx`'s `#arenas` anchor and `components/ArenaGrid.tsx`'s card layout combine to push the first arena's name below a typical mobile viewport after the jump: sticky header (80px, not accounted for by the native anchor scroll) + section padding (`py-20` = 80px) + heading/search block (~150-180px) + `mb-16` gap (64px) + card image (`h-80` = 320px) + card padding (`p-10` top = 40px) ≈ 714-744px before the `<h3>` name renders, before even subtracting the browser's own chrome.

See `proposal.md` for the full motivation on all three issues.

## Goals / Non-Goals

**Goals:**
- Guarantee the checkout CTA is on-screen at the moment a visitor finishes selecting slots, on every viewport width, regardless of page scroll position.
- Give first-time arena-page visitors a clear, low-effort cue that there's more below the hero.
- Make the homepage's "Explore Arenas" jump land somewhere that already shows a recognizable arena card.

**Non-Goals:**
- Redesigning the booking summary sidebar or the arena card visual design beyond the mobile image-height adjustment needed to fix the clipping.
- Investigating/fixing the desktop sticky sidebar's underlying CSS behavior — it's left in place as a secondary summary panel; the fixed bar becomes the guaranteed action point instead of debugging why sticky wasn't consistently working.
- Any change to booking, locking, or payment logic — this is presentation-only.

## Decisions

**1. Desktop CTA: extend the existing mobile fixed-bottom-bar pattern, rather than debug the sticky sidebar.**
The mobile bar (`lg:hidden fixed bottom-0 ...`) already solves this exact problem for small viewports by pinning to the viewport instead of relying on scroll-relative positioning. Removing the `lg:hidden` restriction (and adjusting the sidebar's own button to stay as a secondary/summary action, not the only one) gives desktop the same guarantee with a pattern already shipped and working, instead of spending time reproducing a sticky-CSS bug that wasn't reproducible from code alone. Alternative considered: debug/harden the `sticky top-28` sidebar (e.g. `self-start`, explicit height). Rejected as the primary fix because it doesn't *guarantee* reachability the way a viewport-fixed element does, even if it turns out to resolve the immediate report.

**2. Scroll cue: a simple animated affordance, not a scroll-triggered tutorial/overlay.**
A small bouncing chevron/"scroll" hint anchored to the bottom of the hero section (`app/arena/[slug]/page.tsx`, inside the existing `<section className="relative h-[45vh] ...">`) is enough to signal "more below" without adding a dismissible overlay, onboarding step, or extra state to track. Consistent with the codebase's existing use of small `animate-*` utility classes for this kind of affordance (e.g. `animate-bounce` already used elsewhere in `ArenaGrid.tsx`'s empty state).

**3. Homepage scroll target: fix the sticky-header offset globally via `scroll-margin-top`, plus shrink the mobile card image.**
`scroll-margin-top` on the `#arenas` target (sized to the header's 80px height, e.g. `scroll-mt-20`) is a one-line, standards-based fix that corrects *every* anchor scroll on the site relative to the sticky header, not just this one — cheaper and more robust than a JS-driven scroll handler. Combined with reducing the card image height on mobile only (`h-80` → e.g. `h-48 md:h-80`, via a responsive class — desktop card proportions are unaffected), the vertical distance from the top of the section to the first arena's name drops enough to fit a typical mobile viewport in one jump. Alternative considered: `element.scrollIntoView()` with a JS click handler and manual offset math — rejected in favor of pure CSS since `scroll-margin-top` is exactly what it's designed for and needs no client-side script.

## Risks / Trade-offs

- [Adding a second always-visible CTA on desktop (fixed bar + existing sidebar button) could feel redundant] → Keep the sidebar's button as-is (it's already there for the summary context) and let the fixed bar be the one that's always guaranteed visible; both call the same `handleProceed()`, so there's no behavioral divergence, only a visual one.
- [Shrinking the mobile card image changes the homepage's visual weight on small screens] → Scoped to mobile only (`md:h-80` preserves current desktop appearance); acceptable trade-off since the goal is specifically fitting a recognizable card in one mobile viewport.
- [`scroll-margin-top` isn't supported in very old browsers] → Next.js's browserslist target for this project already excludes browsers old enough for this to matter; graceful degradation is simply "the old anchor behavior," not breakage.

## Migration Plan

Pure frontend/CSS change, no data migration. Ship as a normal deploy (existing VPS `deploy.sh` flow); no feature flag needed since there's no behavioral risk beyond visual layout. Rollback is a plain revert if needed.
