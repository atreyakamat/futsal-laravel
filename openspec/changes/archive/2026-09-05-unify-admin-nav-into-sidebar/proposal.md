## Why

The admin section currently shows navigation in two competing places at once: a top Header nav bar (role-based, added in `booking-flow-and-admin-nav-fixes`) and, on the super admin dashboard specifically, a second left-hand tab sidebar with its own overlapping set of destinations. This is confusing to navigate and, on the super admin dashboard, actively duplicates two features under different implementations (an in-page "Approvals" tab that's a worse copy of the standalone approvals page, and a mostly dead-end standalone Settings page that duplicates the dashboard's own working Settings tab). The user asked to consolidate down to a single left-hand menu for every staff role.

## What Changes

- Replace the top admin nav (currently in `components/Header.tsx`) with a persistent left-hand sidebar, shared across every `/fg-admin/*` page via a new layout, for `super_admin`, `arena_admin`, `manager`, `security`, and `accountant`.
- The top bar stays, but becomes slim for admin pages: logo + the existing profile/logout dropdown only, no nav links.
- The super admin dashboard's own left-hand tab strip (Overview, Arena & Staff, Timings, Block Slots, Approvals, Settings) moves from a competing left column to a horizontal tab bar at the top of its content — so there is exactly one left-hand menu on every admin page, not two.
- **BREAKING** (internal, no external API change): removes the super admin dashboard's in-page "Approvals" tab (and its underlying fetch/resolve code), since it duplicated the better-formatted standalone `/fg-admin/platform/approvals` page with a worse raw-JSON rendering; the sidebar's "Approvals" entry now points at that standalone page instead.
- Deletes the standalone `/fg-admin/platform/settings` page (a mostly read-only, effectively dead-end duplicate of the dashboard's own "Settings" tab, whose one non-duplicate piece — changing the super admin's own login email — is relocated into that Settings tab). The sidebar's "Settings" entry deep-links to that tab via a `?tab=settings` query param the dashboard now reads on load.
- Drops two now-stale references to the deleted settings page: an already-unreachable super_admin-gated Quick Action card on `/fg-admin/platform/dashboard` (dead code — super_admin redirects away from that page before ever reaching it) and a stale code comment in `/fg-admin/platform/audit-logs`.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `admin-rbac`: navigation for every staff role now lives in a single persistent left sidebar instead of a top nav bar (plus, for super_admin, a second competing in-page sidebar); the Approvals and Settings duplication between the super admin dashboard and their standalone pages is resolved in favor of one implementation each.

## Impact

- `components/Header.tsx` (admin nav stripped to a slim bar), new `components/AdminSidebar.tsx`, new `app/fg-admin/layout.tsx`
- `app/fg-admin/platform/super-admin/SuperAdminDashboardClient.tsx` (tab strip becomes horizontal, Approvals tab and its dead code removed, Settings tab gains the relocated email-change form and `?tab=` deep-link support)
- `app/api/fg-admin/super-admin/settings/route.ts` (GET gains the super admin's name in its response)
- Deleted: `app/fg-admin/platform/settings/page.tsx`
- `app/fg-admin/platform/dashboard/page.tsx`, `app/fg-admin/platform/audit-logs/page.tsx` (stale references to the deleted page)
