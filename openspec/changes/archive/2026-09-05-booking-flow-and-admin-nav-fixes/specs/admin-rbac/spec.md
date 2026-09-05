## MODIFIED Requirements

### Requirement: The admin top navigation reflects the signed-in role
Each staff role SHALL see a navigation bar listing the sections actually available to them; a role with no matching navigation entries is a defect, not an intentionally empty menu. This navigation SHALL be present for a signed-in staff member on every page they can reach, not only pages under the admin portal path — a staff member navigating to a non-admin page (for example, a booking confirmation/ticket page) SHALL still see their role's navigation, not a customer-facing header with no way back to the admin portal.

#### Scenario: Accountant logs in
- **WHEN** an accountant signs into the admin portal
- **THEN** they see a working navigation entry for their dashboard, not an empty nav bar

#### Scenario: Arena admin logs in
- **WHEN** an arena_admin signs into the admin portal
- **THEN** they see working navigation entries for their available sections, not an empty nav bar

#### Scenario: Staff member views a page outside the admin portal
- **WHEN** a signed-in staff member (any role) is on a page that is not under the admin portal path
- **THEN** they still see their role's admin navigation rather than the customer-facing header

## ADDED Requirements

### Requirement: A manager can request slot blocks, including beyond the booking window and across a date range
A manager SHALL be able to submit a request to block time slots (or an entire day) for their arena when the ground cannot be used, for a single specific day or for a range of days, and for dates beyond the normal customer-facing booking window. Like other manager-submitted changes, this SHALL go through the existing approval workflow rather than applying immediately.

#### Scenario: Manager requests a block for a single future day
- **WHEN** a manager submits a slot-block request for one date and one or more time slots
- **THEN** the request is created for approval and, once approved, blocks those slots on that date for customer booking

#### Scenario: Manager requests a block across a range of days
- **WHEN** a manager submits a slot-block request specifying a start date and end date (spanning more than one day) along with one or more time slots
- **THEN** a request is created covering every day in that range, and once approved, those slots are blocked on each of those dates

#### Scenario: Manager blocks a date beyond the normal booking window
- **WHEN** a manager submits a slot-block or full-day-closure request for a date further out than the current customer-facing booking window
- **THEN** the request is accepted and, once approved, the block/closure takes effect for that date once it becomes bookable

### Requirement: Staff can return to their own bookings list from a booking's ticket/QR view
When a staff member (not the customer) opens a booking's ticket/QR confirmation page — for example from an admin bookings list — the page SHALL offer a way back to that staff member's own bookings list, instead of only the customer-facing "book again"/"my bookings" actions.

#### Scenario: Manager opens a booking's QR from the arena bookings list
- **WHEN** a manager opens the ticket/QR page for one of their arena's bookings
- **THEN** the page offers a link back to the manager's own bookings list, not a link to the customer dashboard
