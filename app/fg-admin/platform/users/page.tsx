import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listSecurityPermissions } from '@/lib/admin';
import { listStaffAccounts } from '@/lib/super-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  arena_admin: 'Arena Admin (Platform-Wide)',
  manager: 'Manager',
  security: 'Security',
  accountant: 'Accountant',
};

export default async function AdminUsersPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/platform/dashboard');
  }

  const [staff, securityPermissions] = await Promise.all([
    listStaffAccounts(),
    listSecurityPermissions(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Staff <span className="text-primary text-stroke">Directory</span>
        </h1>
        <p className="label-classic !ml-0">
          Every admin, manager, security, and accountant account across the platform
        </p>
      </div>

      <div className="glass-card !p-8 mb-8 flex flex-wrap gap-4">
        <Link href="/fg-admin/platform/super-admin" className="btn-secondary !py-3">
          Manage Managers & Security →
        </Link>
        <Link href="/fg-admin/platform/arena-admins" className="btn-secondary !py-3">
          Manage Arena Admins →
        </Link>
        <Link href="/fg-admin/platform/accountants" className="btn-secondary !py-3">
          Manage Accountants →
        </Link>
      </div>

      <div className="grid gap-4">
        {(staff || []).map((s) => {
          const perms = s.role === 'security' ? securityPermissions?.get(s.id) : null;
          const fullName = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email;
          return (
            <div key={`${s.role}-${s.id}`} className="glass-card !p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid md:grid-cols-3 gap-6 flex-1">
                <div>
                  <span className="label-classic !ml-0 mb-1">Name</span>
                  <span className="text-lg font-black uppercase italic block">{fullName}</span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s.email}</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Role</span>
                  <span className="pill-status">{ROLE_LABELS[s.role] || s.role}</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Arena</span>
                  <span className="text-sm font-black text-white uppercase italic block">
                    {s.arena_name || (s.role === 'manager' || s.role === 'security' ? 'Unassigned' : 'All Turfs')}
                  </span>
                  {perms && (
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mt-1">
                      {perms.canVerifyTicket ? 'Verify ✓' : 'Verify ✗'} · {perms.canConfirmEntry ? 'Entry ✓' : 'Entry ✗'}
                    </span>
                  )}
                </div>
              </div>
              <span className={`pill-status shrink-0 ${s.is_active ? 'border-primary/20 text-primary' : 'border-red-500/20 text-red-400'}`}>
                {s.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          );
        })}
        {(!staff || staff.length === 0) && (
          <div className="glass-card text-center py-20 text-white/40">No staff accounts found.</div>
        )}
      </div>
    </div>
  );
}
