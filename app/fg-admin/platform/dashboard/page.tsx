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

  if (!context || !['super_admin', 'arena_admin', 'manager', 'security'].includes(context.role)) {
    redirect('/fg-admin/login');
  }

  if (context.role === 'super_admin') {
    redirect('/fg-admin/platform/super-admin');
  }

  // A scoped arena_admin (assigned to specific turfs rather than
  // platform-wide) doesn't get the unscoped, every-turf view below — send
  // them to pick a turf instead, whose dashboard is /fg-admin/arena/*
  // (see /fg-admin/select-arena and lib/admin.ts's getAdminContext).
  if (context.role === 'arena_admin' && context.assignedArenaIds.length > 0) {
    redirect('/fg-admin/select-arena');
  }

  // arena_admin (platform-wide, one tier below super_admin) sees unscoped
  // stats across every turf, same as super_admin would — only manager
  // (per-turf) and security get their single arena's numbers. The fuller
  // SuperAdminDashboardClient stays super_admin-exclusive for now (it has
  // refund/GST/account-management controls embedded inline throughout
  // rather than in cleanly separable sections); arena_admin gets this
  // simpler dashboard with turf/slot/booking management access instead.
  const isUnscoped = adminRole === 'super_admin' || adminRole === 'arena_admin';

  const stats = await Promise.all([
    query<{ count: number }>(
      `SELECT COUNT(*) as count FROM arenas WHERE status = ? ${isUnscoped ? '' : 'AND id = ?'}`,
      isUnscoped ? ['active'] : ['active', arenaId]
    ),
    query<{ count: number }>(
      `SELECT COUNT(*) as count FROM bookings WHERE payment_status = ? ${isUnscoped ? '' : 'AND arena_id = ?'}`,
      isUnscoped ? ['confirmed'] : ['confirmed', arenaId]
    ),
    query<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE role = ? ${isUnscoped ? '' : 'AND id IN (SELECT user_id FROM bookings WHERE arena_id = ?)'}`,
      isUnscoped ? ['customer'] : ['customer', arenaId]
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
            href="/fg-admin/platform/arenas"
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
            href="/fg-admin/platform/bookings"
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
            href="/fg-admin/platform/users"
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
          {/* Arena create/edit still uses the stricter readSuperAdminId()
              helper (lib/session.ts), not getAdminContext -- widening that
              centrally would also touch refund/GST/settings/account-mgmt
              routes that must stay super_admin-exclusive. Turf CRUD for
              arena_admin is a known follow-up, not done in this pass. */}
          {adminRole === 'super_admin' && (
            <Link
              href="/fg-admin/platform/arenas/create"
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
            href="/fg-admin/platform/security"
            className="glass-card !p-8 group hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">security</span>
              </div>
              <span className="font-black text-sm uppercase tracking-widest italic group-hover:text-primary transition-colors">Security Portal</span>
            </div>
          </Link>

          {/* Reports was an unconditional tile here duplicating arena_admin's
              Header nav "Reports" link (the only role that both reaches this
              page and has Reports in their own nav, since super_admin
              redirects away above) — removed. */}

          {adminRole === 'super_admin' && (
            <Link
              href="/fg-admin/platform/settings"
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
              href="/fg-admin/platform/users"
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

          {(isUnscoped || adminRole === 'manager') && (
            <Link
              href="/fg-admin/platform/bookings/create"
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

          {(isUnscoped || adminRole === 'manager') && (
            <Link
              href="/fg-admin/platform/slots"
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
              href="/fg-admin/platform/credentials"
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

          {/* Approvals was gated the same as isUnscoped, i.e. effectively
              arena_admin-only here (super_admin redirects away above) —
              duplicated arena_admin's Header nav "Approvals" link, removed. */}

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
