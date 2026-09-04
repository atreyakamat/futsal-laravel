## MODIFIED Requirements

### Requirement: Only staff can cancel a staff-created booking
A staff-created booking SHALL be cancellable either by the customer themselves (self-service, following the same rules an ordinary booking's cancellation would — see the refunds-and-cancellations capability) or by staff (super admin, admin, arena admin, or manager). This reverses the earlier restriction that blocked customer self-cancellation outright; staff cancellation behavior is unchanged.

#### Scenario: Customer attempts self-cancellation
- **WHEN** a customer cancels a booking flagged as staff-created
- **THEN** it is cancelled under the same eligibility and refund rules that would apply to any other confirmed booking they cancel themselves — this is now allowed; it was previously refused

#### Scenario: Staff cancel an unpaid staff-created booking
- **WHEN** an authorized staff member cancels a staff-created booking that is still `pending`
- **THEN** it is cancelled outright with no refund workflow, since nothing was ever collected

#### Scenario: Staff cancel a paid staff-created booking
- **WHEN** an authorized staff member cancels a staff-created booking that is already `confirmed`
- **THEN** it enters the same refund-review queue a customer's own cancellation would, for a staff member to force-refund or decline
