# Refunds And Cancellations Specification

## Purpose
Governs how a confirmed booking gets cancelled and, when eligible, refunded through PayU — for both customer self-service cancellation and staff-forced cancellation/refund.

## Requirements

### Requirement: Customers can self-cancel a confirmed booking within policy
A customer SHALL be able to cancel their own `confirmed` booking. Refund eligibility depends on the arena's refund policy, the configured cancellation cutoff (hours before the slot), and whether the invoice month has closed; cancellation itself stays available up to game start even when no refund applies.

#### Scenario: Cancellation within the refund window
- **WHEN** a customer cancels a confirmed, online-paid booking before the cutoff and before the invoice month ends
- **THEN** the booking becomes `cancelled`, the slot is released immediately, and a refund (gross minus the configured fee) is queued for admin review

#### Scenario: Cancellation outside the refund window
- **WHEN** a customer cancels within the cutoff window, after the invoice month has closed, at an arena with refunds disabled, or on a pay-at-venue booking where nothing was collected
- **THEN** the booking is cancelled and the slot released, but no refund is due

### Requirement: Staff can force-refund outside normal policy
A super admin or platform-wide arena admin SHALL be able to refund or decline a confirmed/cancelled booking's refund at any time, bypassing the cutoff and invoice-month rules, provided a reason is given. The action is logged to the audit trail.

#### Scenario: Force refund with reason
- **WHEN** an authorized staff member submits a force refund with a reason
- **THEN** the system calls PayU's refund API for the calculated (or admin-overridden) amount and records the outcome

#### Scenario: Force refund without a reason
- **WHEN** a force refund is attempted with no reason text
- **THEN** the request is rejected

### Requirement: A refund cannot be actioned before money was actually collected
Force-refund controls SHALL only be available for bookings in a state where payment was actually collected (`confirmed` or `cancelled` with a pending refund decision) — never for a booking that was only ever `pending` or that already failed/expired.

#### Scenario: Booking never paid
- **WHEN** a booking's payment_status is `pending` or `failed`
- **THEN** no refund action is offered for it in the admin UI, and the refund API rejects a request against it

### Requirement: Refund status can be checked against PayU directly
Once a refund has actually been requested from PayU (a refund request id exists), staff SHALL be able to query PayU for its current status and have the booking's refund_status reconciled to match.

#### Scenario: Checking status before a refund was ever requested
- **WHEN** a booking has no PayU refund request id yet (e.g. it is only awaiting an admin's decision)
- **THEN** the status-check action is not offered, since there is nothing at PayU to check yet

#### Scenario: Automatic reconciliation
- **WHEN** a refund is in a non-terminal state (PROCESSING, INITIATED, or PENDING_REVIEW with a request id)
- **THEN** a background job polls PayU periodically and updates the booking to REFUNDED once PayU confirms success, sending the customer a refund-completed email on that transition

### Requirement: A cancelled booking's no-refund reason is preserved and accurately displayed
When a customer cancellation results in no refund being due, the system SHALL persist the specific reason (booking started within the cancellation cutoff, the invoice month has closed, the arena has opted out of refunds, or it was a pay-at-venue booking where nothing was collected) and SHALL show that specific reason to the customer afterward — not a single generic message applied to every no-refund case.

#### Scenario: Cancelled within the cutoff window
- **WHEN** a customer cancels an online-paid booking within the cancellation cutoff (too close to play)
- **THEN** the booking's cancellation status later displays that it was cancelled too close to the booking start, not a claim that it was a pay-at-venue booking

#### Scenario: Cancelled on a genuinely pay-at-venue booking
- **WHEN** a customer cancels a pay-at-venue booking where no payment was ever collected
- **THEN** the booking's cancellation status displays that reason specifically

### Requirement: A cancelled booking is never displayed as a failed payment
The customer-facing booking status SHALL distinguish a `cancelled` booking from one whose payment genuinely `failed` — a cancelled booking (with or without a refund due) SHALL never show the same "payment failed" indicator as a booking that was never successfully paid for.

#### Scenario: Viewing a cancelled booking on the dashboard
- **WHEN** a customer views a booking with payment_status `cancelled`
- **THEN** the dashboard shows it as cancelled, not as a failed payment

#### Scenario: Viewing a genuinely failed payment
- **WHEN** a customer views a booking with payment_status `failed`
- **THEN** the dashboard continues to show it as a failed payment
