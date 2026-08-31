import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listSecurityPermissions } from '@/lib/admin';
import { listStaffAccounts } from '@/lib/super-admin';
import { getActiveArenas } from '@/lib/domain';
import { redirect } from 'next/navigation';
import TeamManagementClient from '@/components/TeamManagementClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/platform/dashboard');
  }

  const [staff, securityPermissions, arenas] = await Promise.all([
    listStaffAccounts(),
    listSecurityPermissions(),
    getActiveArenas(),
  ]);

  const permissionsByStaffId: Record<number, { canVerifyTicket: boolean; canConfirmEntry: boolean }> = {};
  for (const [id, perms] of securityPermissions?.entries?.() ?? []) {
    permissionsByStaffId[id] = perms;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Team <span className="text-primary text-stroke">Management</span>
        </h1>
        <p className="label-classic !ml-0">
          Add and manage every Manager, Security, Admin, and Accountant account across the platform
        </p>
      </div>

      <TeamManagementClient
        initialStaff={staff || []}
        arenas={arenas.map((a) => ({ id: a.id, name: a.name }))}
        permissionsByStaffId={permissionsByStaffId}
      />
    </div>
  );
}
