import { readAuthRole, readArenaId } from '@/lib/session';
import AdminSidebar from '@/components/AdminSidebar';

const STAFF_ROLES = ['super_admin', 'arena_admin', 'manager', 'security', 'accountant'];

export default async function FgAdminLayout({ children }: { children: React.ReactNode }) {
  let role: string | null = null;
  let arenaId: number | null = null;

  try {
    role = await readAuthRole();
    arenaId = await readArenaId();
  } catch (e) {
    console.error('Failed to read session cookies in fg-admin layout:', e);
  }

  // Not a signed-in staff member — the login page, or any edge case — gets
  // no sidebar, just its own content (matches how Header.tsx already skips
  // its admin branch for the same set of roles).
  if (!role || !STAFF_ROLES.includes(role)) {
    return <>{children}</>;
  }

  return (
    <div className="flex max-w-[1600px] mx-auto w-full">
      <AdminSidebar role={role} arenaId={arenaId} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
