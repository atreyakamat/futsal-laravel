## ADDED Requirements

### Requirement: An end-of-day booking recap email is sent daily to super admins, turf admins, and managers
At 8:00 PM IST, the system SHALL send an email covering only the current IST calendar day's bookings: the count of bookings confirmed today, the count cancelled today, and the count played today (confirmed AND checked in at the venue). Super admins and platform-wide turf admins (active `arena_admins` rows with no arena assigned) SHALL each receive one consolidated email covering all turfs. Each arena's active managers (active `arena_admins` rows scoped to that arena) SHALL receive an email scoped to only that arena's counts. Accountants SHALL NOT receive this email.

#### Scenario: End of day with bookings, cancellations, and completed play across turfs
- **WHEN** the 8:00 PM IST job runs and today has confirmed, cancelled, and checked-in bookings across more than one turf
- **THEN** each super admin and each platform-wide turf admin receives one email with all-turf totals for bookings confirmed, cancelled, and played today, and each arena's managers receive a separate email with only their own arena's counts for the same three figures

#### Scenario: No accountant recipients
- **WHEN** the 8:00 PM IST job runs
- **THEN** no account with the accountant role receives this email, regardless of how many accountants are active

#### Scenario: Arena with no active managers
- **WHEN** an active arena has no active manager accounts
- **THEN** no per-arena recap email is sent for that arena, and no error is raised

### Requirement: A morning booking-list email is sent daily to each arena's managers
At 5:00 AM IST, the system SHALL send each arena's active managers an email listing that IST calendar day's bookings for their arena: time slot, customer name, customer mobile number, and amount, for every booking confirmed for that day. Super admins, platform-wide turf admins, and accountants SHALL NOT receive this email.

#### Scenario: Morning list for an arena with confirmed bookings today
- **WHEN** the 5:00 AM IST job runs and an arena has one or more bookings confirmed for today
- **THEN** each active manager of that arena receives an email listing every confirmed booking for today at that arena, with its time slot, customer name, mobile number, and amount

#### Scenario: Arena with no bookings today
- **WHEN** the 5:00 AM IST job runs and an arena has no bookings confirmed for today
- **THEN** that arena's managers still receive the email, showing that there are no bookings for today

#### Scenario: Recipients outside the manager role are unaffected
- **WHEN** the 5:00 AM IST job runs
- **THEN** no super admin, platform-wide turf admin, or accountant account receives this email
