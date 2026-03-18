# Legacy Platform Issues & Refactoring Plan

During the migration to the new AI architecture, several issues and anti-patterns were identified in the legacy codebase (controllers and services). These need to be refactored to ensure the platform is robust, secure, and performant.

## 1. N+1 Query Problem (`ArenaController@index`)
**Issue:** 
The `index` method queries `Pricing::where('arena_id', $arena->id)->min('price')` inside a `foreach` loop over `$arenas`. If there are 50 arenas, this generates 51 queries.
**Solution:**
Use an Eloquent relation (e.g., `hasMany`) combined with `withMin('pricings', 'price')` or a database subquery to fetch all minimum prices in a single query.

## 2. Lack of Database Transactions (`BookingController@process`)
**Issue:**
When a user books multiple slots, the code loops through the `$slots` array and creates a `Booking` record for each slot sequentially. If the 3rd slot fails (e.g., database constraint or crash), the first two slots are still committed, resulting in a partial/corrupted booking state.
**Solution:**
Wrap the entire booking creation loop and lock release inside a `DB::transaction()`.

## 3. Unsafe Pricing Lookup & Missing Validation (`BookingController@process`)
**Issue:**
- The code does `$price = Pricing::where(...)->first()->price;`. If a pricing record doesn't exist, this throws a fatal "attempt to read property 'price' on null" error.
- There is no server-side validation to check if the slots being booked are *actually available*. A user could manipulate the payload to book a slot that someone else just paid for.
**Solution:**
- Use `firstOrFail()` or handle the missing price gracefully.
- Add a strict availability check before inserting any bookings.

## 4. Manual Validation in API Controllers (`Api/SlotController.php`)
**Issue:**
The `status`, `lock`, and `unlock` methods manually check for missing parameters (e.g., `if (!$arenaId || !$date) { return response()->json(['error' => 'Missing parameters'], 400); }`).
**Solution:**
Use Laravel's built-in `$request->validate()` or Form Requests. This automatically handles responses and ensures data typing (e.g., ensuring `slots` is an array).

## 5. Stateful Session Usage in API Routes (`Api/SlotController.php`)
**Issue:**
The API controller heavily relies on `session()->getId()` to track locked slots. By default, `/api` routes in Laravel use the `api` middleware group, which is **stateless** and does not start a session. This means `session()->getId()` might generate a new ID on every request, rendering the slot-locking mechanism broken.
**Solution:**
Either move these routes to the `web.php` file (since they are consumed by the frontend Alpine.js components acting as a stateful client), or implement an explicit locking token passed between the frontend and backend.

## 6. Hardcoded Payment Status (`BookingController@process`)
**Issue:**
The system hardcodes `'payment_status' => 'confirmed'`. There's a comment `// Auto-confirming for now as we don't have real PayU keys`.
**Solution:**
Implement a proper pending state (`'payment_status' => 'pending'`) and prepare a webhook/callback endpoint to mark bookings as confirmed once the payment gateway actually succeeds.
