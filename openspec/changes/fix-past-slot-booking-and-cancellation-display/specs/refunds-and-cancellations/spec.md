## ADDED Requirements

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
