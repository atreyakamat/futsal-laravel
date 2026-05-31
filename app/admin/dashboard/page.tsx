import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);
  const adminRole = context?.role ?? null;
  const arenaId = context?.arenaId ?? null;

  if (!context || !['super_admin', 'arena_admin', 'security'].includes(context.role)) {
    redirect('/admin/login');
  }

  if (context.role === 'super_admin') {
    redirect('/admin/super-admin');
  }

  // Fetch stats - scoped to arena if not super_admin
  const stats = await Promise.all([
    query<{ count: number }>(
      `SELECT COUNT(*) as count FROM arenas WHERE status = ? ${adminRole === 'super_admin' ? '' : 'AND id = ?'}`,
      adminRole === 'super_admin' ? ['active'] : ['active', arenaId]
    ),
    query<{ count: number }>(
      `SELECT COUNT(*) as count FROM bookings WHERE payment_status = ? ${adminRole === 'super_admin' ? '' : 'AND arena_id = ?'}`,
      adminRole === 'super_admin' ? ['confirmed'] : ['confirmed', arenaId]
    ),
    query<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE role = ? ${adminRole === 'super_admin' ? '' : 'AND id IN (SELECT user_id FROM bookings WHERE arena_id = ?)'}`,
      adminRole === 'super_admin' ? ['customer'] : ['customer', arenaId]
    ),
  ]);

  const activeArenas = (stats[0] && stats[0][0]?.count) || 0;
  const totalBookings = (stats[1] && stats[1][0]?.count) || 0;
  const totalUsers = (stats[2] && stats[2][0]?.count) || 0;

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
          {adminRole === 'super_admin' && (
            <Link
              href="/admin/arenas/create"
              className="glass-card !p-8 group hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-2xl">add_location</span>
                </div>
                <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Create Arena</span>
              </div>
            </Link>
          )}

          <Link
            href="/admin/security"
            className="glass-card !p-8 group hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">security</span>
              </div>
              <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Security Portal</span>
            </div>
          </Link>

          <Link
            href="/admin/reports"
            className="glass-card !p-8 group hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">analytics</span>
              </div>
              <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Reports</span>
            </div>
          </Link>

          {adminRole === 'super_admin' && (
            <Link
              href="/admin/settings"
              className="glass-card !p-8 group hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-2xl">settings</span>
                </div>
                <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Settings</span>
              </div>
            </Link>
          )}

          {adminRole === 'super_admin' && (
            <Link
              href="/admin/users"
              className="glass-card !p-8 group hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
                </div>
                <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Admin Mgmt</span>
              </div>
            </Link>
          )}

          {(adminRole === 'super_admin' || adminRole === 'arena_admin') && (
            <Link
              href="/admin/bookings/create"
              className="glass-card !p-8 group hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-2xl">add_card</span>
                </div>
                <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Create Booking</span>
              </div>
            </Link>
          )}

          {(adminRole === 'super_admin' || adminRole === 'arena_admin') && (
            <Link
              href="/admin/slots"
              className="glass-card !p-8 group hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
                </div>
                <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Slots</span>
              </div>
            </Link>
          )}

          {adminRole && (
            <Link
              href="/admin/credentials"
              className="glass-card !p-8 group hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-2xl">vpn_key</span>
                </div>
                <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Credentials</span>
              </div>
            </Link>
          )}

          {adminRole === 'super_admin' && (
            <Link
              href="/admin/approvals"
              className="glass-card !p-8 group hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-2xl">fact_check</span>
                </div>
                <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Approvals</span>
              </div>
            </Link>
          )}

          <form action="/api/auth/logout" method="POST" className="group">
            <button
              type="submit"
              className="w-full glass-card !p-8 group hover:border-red-500/50 hover:bg-red-500/5 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-red-500 text-2xl">logout</span>
                </div>
                <span className="font-black text-sm uppercase tracking-widest italic text-red-500">Logout</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
