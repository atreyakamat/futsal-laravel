# Booking And Payment Specification

## Purpose
Lets a customer browse a turf's slot availability, select slots, and book them online, with payment collected through PayU before a booking counts as confirmed.

## Requirements

### Requirement: Selected slots survive the login redirect
When an unauthenticated visitor selects slots and is redirected to log in, the system SHALL continue to reflect those slots as selected once the visitor returns to the arena page after logging in, without requiring them to reselect.

#### Scenario: Guest selects a slot, logs in, and returns
- **WHEN** a not-logged-in visitor selects one or more slots (held server-side against their session) and is redirected to log in
- **THEN** after a successful login the visitor is returned to the same arena/date and the previously selected slots are still shown as selected, with the total price reflecting them

#### Scenario: A held slot expires before login completes
- **WHEN** a visitor's slot hold lapses (e.g. the hold's time limit passes) before they finish logging in
- **THEN** that slot is shown as available (or booked/blocked, if taken by someone else in the meantime) rather than incorrectly still selected

### Requirement: An OTP-verified contact field cannot be edited
Wherever a logged-in customer can edit their own contact details — at checkout and on the account profile page — the specific field (email or mobile) that was used to complete OTP verification at login SHALL be read-only; the other field remains editable. This SHALL be enforced both in the UI and by the server accepting the update.

#### Scenario: Customer logged in via mobile OTP edits their profile
- **WHEN** a customer who logged in using mobile OTP opens checkout or their profile page
- **THEN** the mobile number field is shown read-only (with a "verified" indicator) and the email field remains editable

#### Scenario: Customer logged in via email OTP edits their profile
- **WHEN** a customer who logged in using email OTP opens checkout or their profile page
- **THEN** the email field is shown read-only (with a "verified" indicator) and the mobile field remains editable

#### Scenario: Direct API call attempts to change the verified field
- **WHEN** a request to update the profile changes the value of the field that matches the customer's login-verification channel
- **THEN** the server rejects the update rather than relying solely on the UI being read-only

### Requirement: Slot availability reflects real-time state
The system SHALL classify each time slot for a given arena and date as one of: available, booked, locked (held by another session), blocked (admin-disabled), or selected (held by the current session).

#### Scenario: Slot already booked or pending elsewhere
- **WHEN** a slot has a booking row with payment_status `pending` or `confirmed`
- **THEN** the slot is shown as unavailable to every other customer

### Requirement: Checkout requires an authenticated customer
A customer SHALL be logged in (verified via mobile or email OTP) to reach checkout; unauthenticated checkout attempts are redirected to log in first, preserving the selected arena/date/slots so they land back at checkout after login.

#### Scenario: Guest selects slots then checks out
- **WHEN** a not-logged-in visitor selects slots and proceeds to checkout
- **THEN** the system redirects to login with the checkout URL preserved as the post-login destination

### Requirement: Customer email is mandatory at checkout
Name, mobile, and email SHALL all be required to submit a booking through the customer-facing checkout; email cannot be left blank.

#### Scenario: Checkout submitted without email
- **WHEN** a customer submits checkout with no email address
- **THEN** the submission is rejected, both in the browser form and by the booking API

### Requirement: A booking starts pending until PayU confirms payment
Creating a booking through checkout SHALL insert it with payment_status `pending` and route the customer to PayU; the booking only becomes `confirmed` once PayU's callback verifies a successful payment.

#### Scenario: Customer completes payment
- **WHEN** PayU's callback reports a hash-verified successful payment for a pending booking
- **THEN** the booking's payment_status becomes `confirmed`, a ticket/QR is issued, and a confirmation email/WhatsApp message is sent

#### Scenario: PayU reports failure or rejects verification
- **WHEN** PayU's callback reports a non-success status, or the postservice verify_payment check disagrees with a "success" callback
- **THEN** the booking's payment_status becomes `failed` and the slot is released

### Requirement: The PayU redirect page only acts on a still-pending booking
Visiting the PayU checkout redirect page for a booking that is no longer `pending` SHALL NOT generate a fresh payment form; it redirects to the outcome that already exists.

#### Scenario: Revisiting the payment link after the booking already resolved
- **WHEN** a customer opens the payment-checkout link for a booking that is already `confirmed`
- **THEN** they are redirected to the booking's success page instead of being sent to PayU again

#### Scenario: Revisiting the payment link for someone else's booking
- **WHEN** a logged-in customer opens a payment-checkout link for a booking they do not own and they are not staff
- **THEN** the system refuses to generate a payment form and shows an ownership error

### Requirement: Abandoning payment at the gateway fails the booking immediately
If a customer reaches PayU and returns to the app without completing payment (e.g. using the browser's back button rather than PayU's own cancel action), the booking SHALL be marked `failed` and the slot released right away, rather than waiting out the abandoned-checkout expiry.

#### Scenario: Customer clicks back on PayU's hosted page
- **WHEN** a customer who was sent to PayU returns to the app's payment redirect page without a completed payment
- **THEN** the booking is marked failed, the slot becomes bookable again, and the customer is shown the payment-failed page with a way to pick new slots at the same turf

### Requirement: An abandoned pending booking expires automatically
A customer-initiated booking left in `pending` for more than 15 minutes with no resolution SHALL be marked `failed`, freeing the slot for other customers. This does not apply to a booking staff created on a customer's behalf (see the Staff-Created Bookings capability).

#### Scenario: Customer closes the tab mid-checkout
- **WHEN** a pending booking's created_at is more than 15 minutes in the past and it was not staff-created
- **THEN** the next slot-availability or booking-creation check marks it failed and frees the slot

### Requirement: Returning to a turf after a failure keeps the turf as the destination
Any "start over" or "back to home" action reached from within the booking/payment flow SHALL return the customer to the specific turf they were booking, not the site's generic home page, whenever the turf is known.

#### Scenario: Payment fails
- **WHEN** a customer's payment fails and they choose to start over
- **THEN** they are taken back to that same turf's page to pick new slots

### Requirement: Customer name is never fabricated from the login identifier
When a customer account is created, the system SHALL NOT store a name that was mechanically derived from the login identifier (such as the local part of an email address, or a generic placeholder like "Player") as if it were the customer's real name. Anywhere a stored name would be shown or pre-filled — including a pre-existing account whose name was fabricated this way before this requirement took effect — the system SHALL treat a fabricated or blank name as absent and prompt the customer for their real name instead of displaying it.

#### Scenario: First-time customer logs in via email OTP
- **WHEN** a customer completes email OTP login for the first time (no existing account)
- **THEN** their account is created with no name, and the checkout name field is shown blank rather than pre-filled with the local part of their email

#### Scenario: First-time customer logs in via mobile OTP
- **WHEN** a customer completes mobile OTP login for the first time (no existing account)
- **THEN** their account is created with no name, and the checkout name field is shown blank rather than pre-filled with "Player"

#### Scenario: Pre-existing account still carries a fabricated name
- **WHEN** a customer account created before this requirement took effect still has its name equal to the local part of its email or the placeholder "Player"
- **THEN** that name is treated as absent wherever it would be shown or pre-filled, the same as a blank name

### Requirement: Customer contact details are collected exactly once per booking
The system SHALL collect a customer's name, mobile, and email for a booking at a single point in the checkout flow. It SHALL NOT offer a separate details-entry step earlier in the flow (e.g. immediately after slot selection, before checkout) whose input is then discarded or silently overwritten by checkout.

#### Scenario: Logged-in customer selects slots and proceeds to checkout
- **WHEN** a logged-in customer selects slots and proceeds toward payment
- **THEN** they are taken directly to the checkout page's details form, with no intermediate customer-details step

### Requirement: Checkout persists corrected customer details to the account
When a customer submits checkout with a name, mobile, or email value that differs from what is currently stored on their account, the system SHALL save the corrected value to their account as part of processing that submission — subject to the existing rule that the field verified via OTP at login cannot be changed. A correction made at checkout SHALL be reflected the next time the customer's details are shown or pre-filled.

#### Scenario: Customer corrects their name at checkout
- **WHEN** a customer submits checkout with a name different from the one stored on their account
- **THEN** the account's stored name is updated to the submitted value

#### Scenario: Customer's next booking reflects the correction
- **WHEN** the same customer starts checkout for a later booking
- **THEN** the name field is pre-filled with the previously corrected name, not the original fabricated or blank value

#### Scenario: Customer attempts to change their OTP-verified field via checkout
- **WHEN** a customer submits checkout with a different value for the field (email or mobile) that was verified via OTP at login
- **THEN** that field is not updated on the account, consistent with the existing OTP-verified-field rule
