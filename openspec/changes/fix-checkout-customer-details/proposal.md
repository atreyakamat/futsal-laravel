## Why

A customer who logs in via email OTP sees their "Full Name" field at checkout pre-filled with their email's local-part (e.g. `basilrjose@gmail.com` → "basilrjose"), because `findOrCreateUserByIdentifier()` fabricates that value at account creation instead of ever asking for a real name. Worse, whatever the customer then types to correct it is discarded: it's only carried forward as a URL query parameter and gets silently overwritten by the fabricated database value once they reach the checkout page — which then asks for name/mobile/email a *second* time in a separate form, reusing the same wrong value. The customer ends up entering their details twice, sees a wrong name both times, and their correction never survives to the actual booking or gets saved for next time.

## What Changes

- `findOrCreateUserByIdentifier()` no longer fabricates a name (email local-part, or the literal string `'Player'`) when creating a customer account — it stores no name, to be filled in honestly the first time it's needed.
- A shared `isPlaceholderName()` check (mirroring the existing `isPlaceholderEmail()`) treats a blank name, and any name already fabricated by the old behavior (email local-part or `'Player'`) on pre-existing accounts, as "no real name yet" everywhere a name is read for display or pre-fill — so already-contaminated accounts self-heal without a data migration.
- The customer-details step in `components/BookingSystem.tsx` (the arena page, shown after slot selection once logged in) is removed. It duplicated the checkout form's name/mobile/email fields, never persisted edits, didn't enforce the OTP-verified-field lock the checkout form does, and its input was overwritten anyway — checkout becomes the single point of entry for these details.
- Submitting checkout now persists a changed name/mobile/email back onto the customer's account (respecting the existing OTP-verified-field lock), reusing the same update path as the account profile page, so a correction made once sticks for future bookings instead of reappearing every time.

## Capabilities

### Modified Capabilities
- `booking-and-payment`: customer name is no longer fabricated from the login identifier; customer contact details are collected exactly once at checkout instead of twice with the first entry silently discarded; details submitted at checkout are persisted to the account.

## Impact

- `lib/domain.ts`: `findOrCreateUserByIdentifier()`, new `isPlaceholderName()` helper.
- `app/layout.tsx`, `app/booking/checkout/page.tsx`, `app/api/dashboard/profile/route.ts` (GET): apply `isPlaceholderName()` wherever a stored name is read for display/pre-fill.
- `components/BookingSystem.tsx`: remove the customer-details input section and its now-unused state/props; `app/arena/[slug]/page.tsx` drops the props that fed it.
- `app/api/bookings/process/route.ts`: persist submitted name/mobile/email onto the `users` row on successful checkout submission, sharing logic with `app/api/dashboard/profile/route.ts`'s `PUT` handler rather than duplicating the OTP-lock/email-uniqueness checks.
- No schema migration: `users.name` stays a required `String` column; the fix stores `''` instead of a fabricated value.
