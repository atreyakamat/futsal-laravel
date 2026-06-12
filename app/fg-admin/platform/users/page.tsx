import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listArenas, listSecurityPermissions, listUsersWithArena } from '@/lib/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/platform/dashboard');
  }

  const [users, arenas, securityPermissions] = await Promise.all([
    listUsersWithArena(),
    listArenas(),
    listSecurityPermissions(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Admin <span className="text-primary text-stroke">Management</span>
        </h1>
        <p className="label-classic !ml-0">Assign arena admins, security staff, and global admins</p>
      </div>

      <form action="/api/fg-admin/platform/users/create" method="POST" className="glass-card space-y-6 mb-8">
        <h2 className="text-2xl font-black uppercase italic">Create Arena Staff</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <input name="name" className="input-field" placeholder="Full name" required />
          <input name="email" type="email" className="input-field" placeholder="Email address" required />
          <input name="customer_mobile" className="input-field" placeholder="Mobile number" />
          <input name="password" type="password" className="input-field" placeholder="Temporary password" required />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <select name="role" className="input-field" defaultValue="arena_admin">
            <option value="arena_admin">arena_admin</option>
            <option value="security">security</option>
          </select>
          <select name="arena_id" className="input-field" defaultValue={arenas[0]?.id ?? ''}>
            <option value="">No arena</option>
            {(arenas || []).map((arena) => (
              <option key={arena.id} value={arena.id}>{arena.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest">
            <input type="checkbox" name="can_verify_ticket" defaultChecked className="w-4 h-4 accent-primary" />
            Security can verify tickets
          </label>
          <label className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest">
            <input type="checkbox" name="can_confirm_entry" defaultChecked className="w-4 h-4 accent-primary" />
            Security can confirm entry
          </label>
        </div>
        <button type="submit" className="btn-primary">Create Staff Account</button>
      </form>

      <div className="grid gap-6">
        {(users || []).map((user) => (
          <form
            key={user.id}
            action="/api/fg-admin/platform/users/role"
            method="POST"
            className="glass-card !p-0 overflow-hidden"
          >
            <input type="hidden" name="user_id" value={user.id} />
            <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="grid md:grid-cols-3 gap-6 flex-1">
                <div>
                  <span className="label-classic !ml-0 mb-1">Name</span>
                  <span className="text-xl font-black uppercase italic block">{user.name}</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Email / Mobile</span>
                  <span className="text-sm font-black uppercase tracking-tight block">{user.email}</span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{user.customer_mobile || 'No Mobile'}</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Current Role</span>
                  <span className="pill-status">{user.role}</span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mt-2">
                    {user.arena_name ? `Arena: ${user.arena_name}` : 'No arena assigned'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <select name="role" defaultValue={user.role} className="input-field !min-h-0 !py-3">
                  <option value="customer">customer</option>
                  <option value="arena_admin">arena_admin</option>
                  <option value="security">security</option>
                  <option value="super_admin">super_admin</option>
                </select>

                <select name="arena_id" defaultValue={user.arena_id ?? ''} className="input-field !min-h-0 !py-3">
                  <option value="">No arena</option>
                  {(arenas || []).map((arena) => (
                    <option key={arena.id} value={arena.id}>{arena.name}</option>
                  ))}
                </select>

                <button type="submit" className="btn-primary">
                  Save Access
                </button>
              </div>

              <div className="w-full lg:w-auto flex flex-wrap gap-4 items-center">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Security Rights</span>
                <label className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <input
                    type="checkbox"
                    name="can_verify_ticket"
                    defaultChecked={securityPermissions?.get(user.id)?.canVerifyTicket ?? true}
                    className="w-4 h-4 accent-primary"
                  />
                  Verify
                </label>
                <label className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <input
                    type="checkbox"
                    name="can_confirm_entry"
                    defaultChecked={securityPermissions?.get(user.id)?.canConfirmEntry ?? true}
                    className="w-4 h-4 accent-primary"
                  />
                  Confirm Entry
                </label>
              </div>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
