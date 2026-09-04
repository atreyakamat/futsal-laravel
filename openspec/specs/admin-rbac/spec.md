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
Each staff role SHALL see a navigation bar listing the sections actually available to them; a role with no matching navigation entries is a defect, not an intentionally empty menu.

#### Scenario: Accountant logs in
- **WHEN** an accountant signs into the admin portal
- **THEN** they see a working navigation entry for their dashboard, not an empty nav bar
