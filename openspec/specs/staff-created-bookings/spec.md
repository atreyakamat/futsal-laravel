# Staff-Created Bookings Specification

## Purpose
Lets super admins, arena admins, and managers reserve a slot on a customer's behalf using the customer's real name, mobile, and email, leaving payment for that customer to complete online after they log in — distinct from a free or discounted walk-in booking, which staff resolve immediately without involving PayU.

## Requirements

### Requirement: Staff pick real, live slot availability
Staff creating a booking on a customer's behalf SHALL see the same live slot-availability grid a customer would (available/booked/locked/blocked), for their assigned arena (managers) or any arena (super admin / platform-wide arena admin), and select one or more available slots.

#### Scenario: Manager books a slot for a walk-in customer
- **WHEN** a manager opens the staff booking form for their arena and a date
- **THEN** they see the real-time slot grid and can select any slot currently available

### Requirement: Customer email is mandatory for a pay-later booking
When staff leave both "free booking" and "discounted price" unset (the plain, pay-later path), the customer's name, mobile, and email SHALL all be required — email is the only correspondence channel before that customer logs in.

#### Scenario: Staff submit without an email
- **WHEN** staff submit a plain (not free, not discounted) booking with no customer email
- **THEN** the submission is rejected

### Requirement: A staff-created pending booking never auto-expires
Unlike a customer's own abandoned checkout, a staff-created booking left `pending` SHALL NOT be swept into `failed` by the 15-minute abandoned-checkout expiry — it stays reserved until the customer pays or a staff member cancels it.

#### Scenario: Customer takes hours to log in and pay
- **WHEN** more than 15 minutes have passed since a staff-created pending booking was made and the customer has not yet paid
- **THEN** the booking and its held slot remain intact, unaffected by the expiry sweep that would fail an ordinary abandoned checkout

### Requirement: The customer is notified by email at creation, with a login-and-pay link
The instant a staff-created pending booking exists, the system SHALL email the customer with the booking details and a link that logs them in and lands them on the payment page for that specific booking.

#### Scenario: Booking created
- **WHEN** staff successfully create a plain, pay-later booking
- **THEN** the customer receives an email with the slot details, amount due, and a "log in and pay" link — no WhatsApp message is sent at this point

### Requirement: A reminder goes out about an hour before an unpaid slot
For a staff-created booking still `pending` roughly one hour before its slot starts, the system SHALL send the customer both an email and a WhatsApp message reminding them the slot is starting soon and payment is still due, exactly once per booking.

#### Scenario: Slot approaching, still unpaid
- **WHEN** a staff-created pending booking's earliest slot is starting in about 55-65 minutes and no reminder has been sent yet
- **THEN** the customer receives both a reminder email and a WhatsApp message, and the booking is marked so it is never reminded twice

#### Scenario: WhatsApp reminder template not yet configured
- **WHEN** no approved WhatsApp template is configured for the payment-reminder message type
- **THEN** the WhatsApp send is skipped with a logged reason, rather than sending unapproved content or misusing an unrelated approved template; the email reminder still sends

### Requirement: Completing payment reaches the same PayU flow as any booking
Once logged in, the customer SHALL complete payment for a staff-created booking through the same PayU checkout used for any pending booking, reachable both from their dashboard and from the emailed link.

#### Scenario: Customer logs in and pays
- **WHEN** the customer follows the login-and-pay link or their dashboard's "Complete Payment" action
- **THEN** they are authenticated, confirmed as the booking's owner, and sent to PayU for that exact booking

### Requirement: Only staff can cancel a staff-created booking
A customer SHALL NOT be able to self-cancel a booking staff created on their behalf, regardless of whether it is still pending or already paid. Only super admin, admin, arena admin, or manager roles can cancel it.

#### Scenario: Customer attempts self-cancellation
- **WHEN** a customer tries to cancel a booking flagged as staff-created, at any payment status
- **THEN** the request is refused and they are directed to contact the arena or support

#### Scenario: Staff cancel an unpaid staff-created booking
- **WHEN** an authorized staff member cancels a staff-created booking that is still `pending`
- **THEN** it is cancelled outright with no refund workflow, since nothing was ever collected

#### Scenario: Staff cancel a paid staff-created booking
- **WHEN** an authorized staff member cancels a staff-created booking that is already `confirmed`
- **THEN** it enters the same refund-review queue a customer's own cancellation would, for a staff member to force-refund or decline
