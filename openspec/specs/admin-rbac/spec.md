# Admin RBAC Specification

## Purpose
Controls which staff role can see and act on which arenas and operations across the admin portal (`/fg-admin`).

## Requirements

### Requirement: A fixed role hierarchy governs staff access
Staff roles are: `super_admin` (platform-wide, every arena), `arena_admin` (platform-wide by default, or scoped to specific assigned turfs), `manager` (a single assigned arena), `security` (ticket check-in only, scoped to one arena), and `accountant` (financial reporting, platform-wide). Each role's admin pages and API routes SHALL check the caller's role before acting.

#### Scenario: Manager tries a platform-wide action
- **WHEN** a manager attempts an action reserved for super_admin/arena_admin (e.g. creating a new arena)
- **THEN** the request is rejected regardless of any client-side UI state

### Requirement: A scoped arena_admin cannot act outside their assigned turfs
An arena_admin assigned to specific turfs (rather than platform-wide) SHALL only be able to view or modify bookings, slots, and settings for those assigned arenas.

#### Scenario: Scoped admin targets a different arena_id
- **WHEN** a scoped arena_admin submits a request naming an arena_id outside their assignment
- **THEN** the server rejects it even though the client only intended to hide the option, not enforce it

### Requirement: The admin top navigation reflects the signed-in role
Each staff role SHALL see one navigation surface — a persistent left-hand sidebar, present on every page under the admin portal path — listing the sections actually available to them; a role with no matching navigation entries is a defect, not an intentionally empty menu. The admin top bar SHALL NOT duplicate this navigation: it carries only branding and the account/profile menu (including logout), with all destination links living in the sidebar. That top bar SHALL remain visible for a signed-in staff member on any page, including outside the admin portal path, so they always retain their account menu even on the pages the full sidebar does not follow them to.

#### Scenario: Accountant logs in
- **WHEN** an accountant signs into the admin portal
- **THEN** they see a working sidebar navigation entry for their dashboard, not an empty sidebar

#### Scenario: Arena admin logs in
- **WHEN** an arena_admin signs into the admin portal
- **THEN** they see working sidebar navigation entries for their available sections, not an empty sidebar

#### Scenario: A page has its own sub-sections
- **WHEN** a staff member is on a page that itself has sub-sections (e.g. the super admin dashboard's Overview/Arena & Staff/Timings/Block Slots/Settings views)
- **THEN** those sub-sections are presented within that page's own content area (e.g. as a horizontal tab bar), not as a second left-hand sidebar competing with the persistent one

#### Scenario: Staff member views a page outside the admin portal
- **WHEN** a signed-in staff member is on a page that is not under the admin portal path
- **THEN** they still see the admin top bar (branding and account menu), though the full sidebar navigation only appears under the admin portal path — a page staff routinely reach from outside it (e.g. a booking's ticket/QR page) provides its own explicit way back instead

### Requirement: A duplicated admin feature has exactly one reachable implementation
Where the same administrative feature exists in more than one place in the admin portal, the navigation SHALL route staff to exactly one implementation of it; a duplicate implementation is either removed or made unreachable from navigation, so staff are never left choosing between an old and current version of the same feature.

#### Scenario: Reviewing pending approval requests
- **WHEN** a super_admin wants to review pending approval requests
- **THEN** navigation leads them to the one approvals view meant for that purpose, not to two different renderings of the same data

#### Scenario: Changing the platform's editable settings
- **WHEN** a super_admin wants to change an editable platform setting (e.g. the booking window, or their own login email)
- **THEN** navigation leads them to the one place those controls live, not to a second page that only echoes some of the same values read-only

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
