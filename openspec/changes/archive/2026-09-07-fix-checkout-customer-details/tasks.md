## 1. Stop fabricating names, add placeholder detection

- [x] 1.1 In `lib/domain.ts`, change `findOrCreateUserByIdentifier()` so the inserted `name` is `''` for both the email and mobile branches (remove the `identifier.split('@')[0]` / `'Player'` fabrication) and verify a fresh OTP signup for a brand-new email/mobile creates a `users` row with `name = ''`.
- [x] 1.2 Add `isPlaceholderName(name: string | null | undefined, email: string | null | undefined): boolean` next to `isPlaceholderEmail()` in `lib/domain.ts` — true when `name` is blank/whitespace, equals `'player'` case-insensitively, or equals the local part of `email` case-insensitively (only when `email` itself is not a placeholder) — and verify with unit tests covering: blank name, `'Player'`, email-local-part match, a real name that happens to differ from the email prefix (false case), and a placeholder email (should not match on it).

## 2. Apply placeholder detection at every read site

- [x] 2.1 In `app/layout.tsx`, filter `user.name` through `isPlaceholderName()` (pass `user.email` too) before assigning `userName`, so the header greeting shows nothing rather than a fabricated name; verify by loading any page as a customer whose stored name is still fabricated and confirming the greeting no longer shows it.
- [x] 2.2 In `app/booking/checkout/page.tsx`, apply `isPlaceholderName()` when computing `paramName` from `currentUser.name` (same pattern already used for `paramEmail`/`isPlaceholderEmail`) and verify the checkout name field renders blank, not a fabricated value, for an affected account.
- [x] 2.3 In `app/api/dashboard/profile/route.ts`'s `GET` handler, apply `isPlaceholderName()` to the returned `name` field the same way `email` is already filtered, and verify `/dashboard/profile` shows the name field blank rather than fabricated for an affected account.

## 3. Consolidate customer-details entry into checkout only

- [x] 3.1 Remove the `selectedSlots.length > 0 && isLoggedIn` customer-details JSX block from `components/BookingSystem.tsx` (~line 662-747), along with the now-unused `customerName`/`customerMobile`/`customerEmail` state, the `initialCustomerName`/`initialCustomerMobile`/`initialCustomerEmail` props and their query-param forwarding in `handleProceed()` (~line 304-307); verify the arena page still compiles/renders and, once slots are selected while logged in, proceeding goes straight to `/booking/checkout` with no intermediate details step.
- [x] 3.2 Remove the corresponding `initialCustomerName`/`initialCustomerMobile`/`initialCustomerEmail` props passed from `app/arena/[slug]/page.tsx` (~line 221-223) to `<BookingSystem>`; verify no remaining references to those prop names anywhere in the codebase (`grep -r initialCustomer`).
- [x] 3.3 Manually walk the full flow end to end: guest selects slots → login → arena page → checkout — confirm the arena page shows no customer-details form and checkout is the only place name/mobile/email are entered.

## 4. Persist checkout corrections to the account

- [x] 4.1 In `lib/domain.ts`, extract the customer-role update logic from `app/api/dashboard/profile/route.ts`'s `PUT` handler (OTP-verified-field lock check, email-uniqueness check, the `UPDATE users SET name = ?, email = ?, customer_mobile = ? ...` statement) into a shared function, e.g. `updateCustomerProfile(userId, { name, email, customer_mobile }, authChannel)`, returning enough detail (success/error reason) for both callers to produce their existing responses.
- [x] 4.2 Update `app/api/dashboard/profile/route.ts`'s `PUT` handler (customer branch only — leave the `super_admin`/`manager`/`security` branches as-is) to call the shared function instead of inlining the logic, and verify existing profile-update behavior is unchanged (OTP-locked field still rejected, email uniqueness still enforced, success response unchanged).
- [x] 4.3 In `app/api/bookings/process/route.ts`, after successfully creating the booking (or before, but only on a path that will succeed — don't persist on a failed slot-lock attempt), call the shared `updateCustomerProfile()` with the submitted `customer_name`/`customer_mobile`/`customer_email`, ignoring/logging (not failing the booking on) an OTP-lock rejection or email-uniqueness conflict, since the booking itself must still succeed even if the profile sync doesn't; verify a booking still succeeds even when the submitted email collides with another account's email.
- [x] 4.4 Verify end to end: log in as a customer with a fabricated/blank name, complete checkout with a real name, confirm `users.name` now holds it, then start a second booking and confirm checkout pre-fills the corrected name.

## 5. Regression check

- [x] 5.1 Run the existing test suite (`--pool=forks`) and confirm no existing checkout/profile/auth tests regress; add/update tests for the OTP-verified-field lock scenarios now that they're exercised through the shared function from two call sites.
