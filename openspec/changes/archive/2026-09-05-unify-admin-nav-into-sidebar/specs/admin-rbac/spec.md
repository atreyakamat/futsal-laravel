## MODIFIED Requirements

### Requirement: The admin top navigation reflects the signed-in role
Each staff role SHALL see one navigation surface — a persistent left-hand sidebar, present on every admin page for that role — listing the sections actually available to them; a role with no matching navigation entries is a defect, not an intentionally empty menu. The admin top bar SHALL NOT duplicate this navigation: it carries only branding and the account/profile menu (including logout), with all destination links living in the sidebar.

#### Scenario: Accountant logs in
- **WHEN** an accountant signs into the admin portal
- **THEN** they see a working sidebar navigation entry for their dashboard, not an empty sidebar

#### Scenario: Arena admin logs in
- **WHEN** an arena_admin signs into the admin portal
- **THEN** they see working sidebar navigation entries for their available sections, not an empty sidebar

#### Scenario: A page has its own sub-sections
- **WHEN** a staff member is on a page that itself has sub-sections (e.g. the super admin dashboard's Overview/Arena & Staff/Timings/Block Slots/Settings views)
- **THEN** those sub-sections are presented within that page's own content area (e.g. as a horizontal tab bar), not as a second left-hand sidebar competing with the persistent one

## ADDED Requirements

### Requirement: A duplicated admin feature has exactly one reachable implementation
Where the same administrative feature exists in more than one place in the admin portal, the navigation SHALL route staff to exactly one implementation of it; a duplicate implementation is either removed or made unreachable from navigation, so staff are never left choosing between an old and current version of the same feature.

#### Scenario: Reviewing pending approval requests
- **WHEN** a super_admin wants to review pending approval requests
- **THEN** navigation leads them to the one approvals view meant for that purpose, not to two different renderings of the same data

#### Scenario: Changing the platform's editable settings
- **WHEN** a super_admin wants to change an editable platform setting (e.g. the booking window, or their own login email)
- **THEN** navigation leads them to the one place those controls live, not to a second page that only echoes some of the same values read-only
