import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';

export default async function AdminUsersPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  // Check if superadmin
  const adminUser = await query<{ role: string }>(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (adminUser.length === 0 || adminUser[0].role !== 'super_admin') {
    redirect('/admin/dashboard');
  }

  const users = await query<{
    id: number;
    name: string;
    email: string;
    customer_mobile: string | null;
    role: string;
    created_at: string;
  }>('SELECT id, name, email, customer_mobile, role, created_at FROM users ORDER BY created_at DESC LIMIT 100');

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Admin <span className="text-primary text-stroke">Management</span>
        </h1>
        <p className="label-classic !ml-0">Total System Users: {users.length}</p>
      </div>

      <div className="grid gap-6">
        {users.map((user) => (
          <div key={user.id} className="glass-card !p-0 overflow-hidden group hover:border-primary/30 transition-all duration-500">
            <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6 flex-1 w-full">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${
                  user.role === 'super_admin' ? 'bg-accent-purple/10 border border-accent-purple/20 text-accent-purple' : 
                  user.role === 'admin' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/10 text-white/20'
                }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {user.role === 'super_admin' ? 'military_tech' : user.role === 'admin' ? 'shield' : 'person'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1">
                  <div>
                    <span className="label-classic !ml-0 mb-1">Name</span>
                    <span className="text-xl font-black text-white uppercase italic block truncate">{user.name}</span>
                  </div>
                  <div>
                    <span className="label-classic !ml-0 mb-1">Email / Mobile</span>
                    <span className="text-sm font-black text-white/60 block truncate uppercase tracking-tight">{user.email}</span>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{user.customer_mobile || 'No Mobile'}</span>
                  </div>
                  <div>
                    <span className="label-classic !ml-0 mb-1">Access Role</span>
                    <span className={`pill-status ${
                      user.role === 'super_admin' ? 'border-accent-purple/20 text-accent-purple' : 
                      user.role === 'admin' ? 'border-primary/20 text-primary' : 'border-white/10 text-white/40'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <button className="btn-secondary !py-3 !px-4 !rounded-xl opacity-50 cursor-not-allowed">
                  <span className="material-symbols-outlined">settings_suggest</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
