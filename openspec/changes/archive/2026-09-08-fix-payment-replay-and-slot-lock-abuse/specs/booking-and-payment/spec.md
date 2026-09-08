## ADDED Requirements

### Requirement: A cancelled booking's payment cannot be re-confirmed
Once a booking has been cancelled, the system SHALL NOT transition it back to `confirmed` — including in response to a payment-gateway callback reporting success, however it arrives (a genuine delayed delivery, a duplicate delivery, or the same callback payload submitted again later).

#### Scenario: A success callback arrives after the booking was cancelled
- **WHEN** a payment-success callback for a booking is received (or re-submitted) after that booking's payment_status is `cancelled`
- **THEN** the booking remains `cancelled` and is not transitioned to `confirmed`

#### Scenario: A success callback arrives while the booking is still pending
- **WHEN** a payment-success callback for a `pending` booking passes verification
- **THEN** the booking is confirmed as normal

### Requirement: Slot locking is capped per client to prevent availability-denial abuse
The system SHALL limit how many time slots a single client may hold locked at once, independent of any client-supplied session identifier, so that no single actor can lock a large share of an arena's available slots and deny them to other customers.

#### Scenario: A client attempts to lock far more slots than a normal booking would need
- **WHEN** a client that already holds the maximum number of concurrently active slot locks requests another lock
- **THEN** the additional lock request fails, the same way a request for an already-booked slot fails

#### Scenario: A normal customer selecting a multi-slot booking is unaffected
- **WHEN** a customer selects a reasonable number of slots for their own booking
- **THEN** all of their lock requests succeed as before
