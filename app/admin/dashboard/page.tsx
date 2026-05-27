import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function getAdminRole(userId: number | null): Promise<string | null> {
  if (!userId) return null;
  
  const user = await query<{ role: string }>(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  
  if (user.length === 0) return null;
  const role = user[0].role;
  return ['admin', 'super_admin', 'arena_admin'].includes(role) ? role : null;
}

export default async function AdminDashboardPage() {
  const userId = await readAuthUserId();
  const adminRole = await getAdminRole(userId);

  if (!adminRole) {
    redirect('/admin/login');
  }

  // Fetch stats
  const stats = await Promise.all([
    query<{ count: number }>(
      'SELECT COUNT(*) as count FROM arenas WHERE status = ?',
      ['active']
    ),
    query<{ count: number }>(
      'SELECT COUNT(*) as count FROM bookings WHERE payment_status = ?',
      ['confirmed']
    ),
    query<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['customer']
    ),
  ]);

  const activeArenas = stats[0][0]?.count || 0;
  const totalBookings = stats[1][0]?.count || 0;
  const totalUsers = stats[2][0]?.count || 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic mb-4">
          Admin <span className="text-primary">Dashboard</span>
        </h1>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
          Role: <span className="text-primary uppercase">{adminRole}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="glass-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="label-classic !ml-0">
                Active Arenas
              </span>
              <span className="text-5xl font-black text-white italic">{activeArenas}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">stadium</span>
            </div>
          </div>
          <Link
            href="/admin/arenas"
            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-white transition-colors"
          >
            Manage Arenas →
          </Link>
        </div>

        <div className="glass-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="label-classic !ml-0">
                Confirmed Bookings
              </span>
              <span className="text-5xl font-black text-white italic">{totalBookings}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">book_online</span>
            </div>
          </div>
          <Link
            href="/admin/bookings"
            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-white transition-colors"
          >
            View Bookings →
          </Link>
        </div>

        <div className="glass-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="label-classic !ml-0">
                Total Users
              </span>
              <span className="text-5xl font-black text-white italic">{totalUsers}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">people</span>
            </div>
          </div>
          <Link
            href="/admin/users"
            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-white transition-colors"
          >
            Manage Users →
          </Link>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="glass-card">
        <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter">
          Quick <span className="text-primary">Actions</span>
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/arenas/create"
            className="glass p-6 rounded-2xl border border-white/10 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-primary">add_location</span>
              </div>
              <span className="font-bold text-sm uppercase tracking-wider">Create Arena</span>
            </div>
          </Link>

          <Link
            href="/admin/security"
            className="glass p-6 rounded-2xl border border-white/10 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-primary">security</span>
              </div>
              <span className="font-bold text-sm uppercase tracking-wider">Security Portal</span>
            </div>
          </Link>

          <Link
            href="/admin/reports"
            className="glass p-6 rounded-2xl border border-white/10 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-primary">analytics</span>
              </div>
              <span className="font-bold text-sm uppercase tracking-wider">Reports</span>
            </div>
          </Link>

          {adminRole === 'super_admin' && (
            <Link
              href="/admin/settings"
              className="glass p-6 rounded-2xl border border-white/10 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <span className="material-symbols-outlined text-primary">settings</span>
                </div>
                <span className="font-bold text-sm uppercase tracking-wider">Settings</span>
              </div>
            </Link>
          )}

          {adminRole === 'super_admin' && (
            <Link
              href="/admin/users"
              className="glass p-6 rounded-2xl border border-white/10 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
                </div>
                <span className="font-bold text-sm uppercase tracking-wider">Admin Management</span>
              </div>
            </Link>
          )}

          <Link
            href="/api/auth/logout"
            className="glass p-6 rounded-2xl border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 transition-all group"
            onClick={(e) => {
              e.preventDefault();
              const form = document.createElement('form');
              form.method = 'POST';
              form.action = '/api/auth/logout';
              document.body.appendChild(form);
              form.submit();
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                <span className="material-symbols-outlined text-red-500">logout</span>
              </div>
              <span className="font-bold text-sm uppercase tracking-wider text-red-500">Logout</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
