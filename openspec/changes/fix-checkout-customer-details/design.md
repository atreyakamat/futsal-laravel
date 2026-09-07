## Context

See proposal.md - Why. Two root causes, one shared fix pattern already established in this codebase:

- `lib/domain.ts`'s `findOrCreateUserByIdentifier()` (~line 888-904) sets `name = identifier.split('@')[0]` for email signups, `'Player'` for mobile signups.
- `isPlaceholderEmail()` already exists in the same file for the analogous problem on the email column (`user-xxxxxxxx@agnelarena.com` auto-generated addresses) and is already applied at every read site that matters (`app/booking/checkout/page.tsx`, `app/api/dashboard/profile/route.ts`). The name fix follows the same pattern rather than inventing a new one.
- `users.name` is `String` (NOT NULL, no default) in `prisma/schema.prisma` — storing `''` requires no migration, consistent with how the existing placeholder-email account already stores a real (non-null) throwaway value rather than NULL.
- `components/BookingSystem.tsx`'s customer-details section (~line 662-747) and `components/CheckoutForm.tsx` are two independent React forms for the same three fields, wired together only by URL query params (`BookingSystem`'s `handleProceed()` builds `?name=&mobile=&email=`) that `app/booking/checkout/page.tsx` then overrides with DB values (line 55-57: `paramName = currentUser.name || paramName`). Nothing currently persists either form's input back to `users`.
- `app/api/dashboard/profile/route.ts`'s `PUT` handler already contains the correct, tested logic for updating `name`/`email`/`customer_mobile` on a `users` row: it enforces the OTP-verified-field lock, checks email uniqueness, and branches for `manager`/`arena_admin`/`security` roles that mirror their row into other tables. Checkout submission needs the same guarantees for its subset (a customer role only), not a rewrite of them.

## Goals / Non-Goals

**Goals:**
- Stop fabricating names at account creation.
- Make existing fabricated/blank names self-heal at read time, without a backfill migration.
- Collapse two customer-details forms into one (checkout), removing the dead second form entirely rather than leaving unused props/state behind.
- Persist a checkout-time correction so it isn't asked again next booking.

**Non-Goals:**
- Not touching the OTP-verified-field lock rule itself (`readAuthChannel()`-based), only preserving it through the consolidation.
- Not backfilling/rewriting existing fabricated names in the database — `isPlaceholderName()` makes that unnecessary; the stored value stays until the customer next submits a real one (via checkout or the profile page), at which point it's overwritten normally.
- Not changing `app/dashboard/profile/page.tsx` behavior — it already asks for name unconditionally on every visit (`required`, always rendered) and is unaffected by this bug.
- Not touching `admin_created` (staff-created booking) flows — those don't go through `BookingSystem`/`CheckoutForm` at all.

## Decisions

**`isPlaceholderName(name, email)` lives in `lib/domain.ts` next to `isPlaceholderEmail()`.** Signature takes both name and email because detecting the email-derived case requires comparing `name` against the *current* email's local part (not just checking against a fixed pattern) — a genuine customer named e.g. "Basil" whose email happens to start with "basil" is not a false positive to worry about (harmless if it re-prompts a name that already happens to be right), but the check should still be principled: `isPlaceholderName(name, email)` returns true when `name` is blank, equals `'Player'` (case-insensitive), or equals the local part of `email` (case-insensitive) when `email` isn't itself a placeholder.

**Apply `isPlaceholderName()` at every read site that currently trusts `users.name` for display/pre-fill**, not just checkout — found via the same grep the proposal's Impact section lists: `app/layout.tsx` (header greeting), `app/booking/checkout/page.tsx` (`paramName`), `app/api/dashboard/profile/route.ts` `GET`. This mirrors exactly how `isPlaceholderEmail()` is already applied at multiple sites rather than one, and costs nothing extra since all three already import from `lib/domain.ts`.

**Remove `BookingSystem.tsx`'s customer-details section entirely, don't just hide it.** Alternative considered: keep the fields but make them read-only/informational, or keep collecting there and stop collecting at checkout instead. Rejected both — `CheckoutForm.tsx` already has the OTP-lock UI (`lockedField` prop) and policy-agreement modal that `BookingSystem`'s copy never had, so checkout is the more correct implementation of the two; keeping the arena-page copy around (even inert) leaves dead state (`customerName`/`customerMobile`/`customerEmail`) and props (`initialCustomerName` etc.) with no reader, which the project's conventions call out to avoid. `handleProceed()`'s checkout URL no longer needs `&name=&mobile=&email=` params at all once checkout stops trusting query params over fresher DB data for pre-fill (see next decision) — they become dead weight, not a fallback worth keeping.

**Checkout's own pre-fill keeps reading from `users` (via `isPlaceholderName`-filtered `currentUser.name`), not from URL query params, once `BookingSystem` no longer sends them.** The query-param path (`resolvedSearchParams.name` etc.) in `app/booking/checkout/page.tsx` is left in place rather than deleted outright — it's also the landing point after the login redirect (line 44-48 preserves the full query string through `/login?next=...`), and removing it would require re-verifying that path too. It simply stops being populated with customer-detail fields once `BookingSystem` no longer sends them; `paramName`/`paramMobile`/`paramEmail` still exist as fallback variables but in practice now come from the DB.

**Checkout-submission persistence reuses `/api/dashboard/profile`'s update logic rather than duplicating it inline in `/api/bookings/process`.** Extract the customer-role branch of `PUT /api/dashboard/profile` (auth-channel lock checks, email-uniqueness check, the `UPDATE users ...` statement) into a shared function in `lib/domain.ts` (e.g. `updateCustomerProfile(userId, { name, email, customer_mobile }, authChannel)` returning a discriminated result), called from both the profile route and `app/api/bookings/process/route.ts`. Alternative considered: have `/api/bookings/process` call the existing `PUT /api/dashboard/profile` endpoint internally over HTTP — rejected as an unnecessary self-call round-trip inside a server route; a shared function is the same pattern already used elsewhere in `lib/domain.ts` for logic shared across routes.

## Risks / Trade-offs

- [A customer's `bookings.customer_name` for a *past* booking still shows whatever fabricated/blank name existed at the time it was submitted] → Not retroactively touched; `bookings` rows are historical records of what was submitted, same treatment as any other booking field. Only the live account (`users.name`) and future bookings are affected.
- [Removing `BookingSystem`'s details section changes the visible arena-page flow] → Matches the spec's new "collected exactly once" requirement directly; the section's own comments already establish it was a login gate more than a real second data-entry need (see BookingSystem.tsx lines 641-645).
- [`isPlaceholderName`'s `'Player'` / email-local-part heuristic could theoretically clear a real name that happens to match] → Accepted: worst case is a customer with a true positive coincidence gets re-prompted once at their next checkout or profile visit, which is a much smaller cost than the current guaranteed-wrong prefill for every OTP-created account.
