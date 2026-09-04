## ADDED Requirements

### Requirement: Reschedule authority belongs to super_admin and arena_admin, not manager
Staff-initiated rescheduling of a customer's booking (as opposed to a customer rescheduling their own booking, which any customer can already do) SHALL be restricted to `super_admin` and `arena_admin`. A `manager` account SHALL NOT see or be able to trigger a staff-initiated reschedule.

#### Scenario: Manager attempts a staff-initiated reschedule
- **WHEN** an account with the `manager` role calls the staff reschedule action, directly or through the admin UI
- **THEN** the request is rejected

#### Scenario: Arena admin reschedules a booking
- **WHEN** an `arena_admin` reschedules a booking at an arena they have access to
- **THEN** the reschedule succeeds, subject to the same slot-availability and past-date checks as today
