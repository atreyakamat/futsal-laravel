## MODIFIED Requirements

### Requirement: Slot availability reflects real-time state
The system SHALL classify each time slot for a given arena and date as one of: available, booked, locked (held by another session), blocked (admin-disabled), past (the slot's own start time has already elapsed), or selected (held by the current session).

#### Scenario: Slot already booked or pending elsewhere
- **WHEN** a slot has a booking row with payment_status `pending` or `confirmed`
- **THEN** the slot is shown as unavailable to every other customer

#### Scenario: Slot's start time has already elapsed
- **WHEN** a time slot's own start time (on the date being viewed) is at or before the current moment
- **THEN** the slot is classified `past` and shown as unavailable and non-clickable, distinct from a `booked` slot since no one booked it

## ADDED Requirements

### Requirement: A slot cannot be locked or booked once its start time has passed
Independent of what the client displays, the server SHALL reject locking or booking a time slot whose own start time (given the requested booking date) is at or before the current moment — the same way a date beyond the maximum bookable window is already rejected.

#### Scenario: Direct API request for an already-started slot
- **WHEN** a slot-lock or booking-creation request targets a time slot whose start time has already passed
- **THEN** the request fails for that slot, regardless of whether it was ever shown as selectable in the UI

#### Scenario: Booking a same-day slot that hasn't started yet
- **WHEN** a customer books a time slot later today whose start time has not yet arrived
- **THEN** the request succeeds as normal
