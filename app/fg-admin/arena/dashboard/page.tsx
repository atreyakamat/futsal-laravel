import { cookies } from 'next/headers';
import { unsignValue } from '@/lib/session';
import { getAdminContext, getArenaEntryMode } from '@/lib/admin';
import { getArenaById, query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ArenaAdminDashboardPage() {
  const cookieStore = await cookies();
  const userIdSigned = cookieStore.get('fg_auth_user')?.value;
  const sessionIdSigned = cookieStore.get('fg_session_id')?.value;
  const userId = userIdSigned ? Number(unsignValue(userIdSigned) ?? 0) : null;
  const sessionId = sessionIdSigned ? unsignValue(sessionIdSigned) ?? null : null;
  const context = await getAdminContext(userId, sessionId);

  if (!context || context.role !== 'arena_admin' || !context.arenaId) {
    redirect('/fg-admin/login');
  }

  const arenaId = context.arenaId;
  const arena = await getArenaById(arenaId);

  const [confirmedResult, revenueResult, customersResult, pendingResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM bookings WHERE arena_id = ? AND payment_status = 'confirmed'`,
      [arenaId]
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM bookings WHERE arena_id = ? AND payment_status = 'confirmed'`,
      [arenaId]
    ),
    query<{ count: string }>(
      `SELECT COUNT(DISTINCT customer_mobile) as count FROM bookings WHERE arena_id = ?`,
      [arenaId]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM approval_requests WHERE arena_id = ? AND status = 'pending'`,
      [arenaId]
    ),
  ]);

  const confirmedBookings = Number(confirmedResult[0]?.count ?? 0);
  const totalRevenue = Number(revenueResult[0]?.total ?? 0);
  const uniqueCustomers = Number(customersResult[0]?.count ?? 0);
  const pendingApprovals = Number(pendingResult[0]?.count ?? 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic mb-4">
            Arena <span className="text-primary">Manager</span>
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Facility: <span className="text-white">{arena?.name || 'My Arena'}</span>
          </p>
        </div>
        <div className="glass px-8 py-5 rounded-[2rem] border border-white/5 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-primary italic">Live Operations</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="glass-card">
          <span className="label-classic !ml-0 mb-2">Confirmed Bookings</span>
          <span className="text-4xl font-black text-white italic block mb-4">{confirmedBookings}</span>
          <Link href="/fg-admin/arena/bookings" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-white transition-colors">
            View Bookings →
          </Link>
        </div>

        <div className="glass-card">
          <span className="label-classic !ml-0 mb-2">Total Revenue</span>
          <span className="text-4xl font-black text-white italic block mb-4">₹{totalRevenue}</span>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">From online booking</span>
        </div>

        <div className="glass-card">
          <span className="label-classic !ml-0 mb-2">Unique Players</span>
          <span className="text-4xl font-black text-white italic block mb-4">{uniqueCustomers}</span>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Customer contacts</span>
        </div>

        <div className="glass-card">
          <span className="label-classic !ml-0 mb-2">Pending Requests</span>
          <span className="text-4xl font-black text-white italic block mb-4">{pendingApprovals}</span>
          <Link href="/fg-admin/arena/slots" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-white transition-colors">
            View Requests →
          </Link>
        </div>
      </div>

      {/* Action panel */}
      <div className="glass-card">
        <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter italic">
          Manager <span className="text-primary">Operations</span>
        </h2>

        <div className="grid md:grid-cols-4 gap-6">
          <Link href="/fg-admin/arena/bookings" className="glass-card !p-8 group hover:border-primary/50 transition-all">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">book_online</span>
              </div>
              <span className="font-black text-xs uppercase tracking-widest italic group-hover:text-primary transition-colors">Bookings List</span>
            </div>
          </Link>

          <Link href="/fg-admin/arena/slots" className="glass-card !p-8 group hover:border-primary/50 transition-all">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
              </div>
              <span className="font-black text-xs uppercase tracking-widest italic group-hover:text-primary transition-colors">Slot & Mode</span>
            </div>
          </Link>

          <Link href="/fg-admin/arena/settings" className="glass-card !p-8 group hover:border-primary/50 transition-all">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">settings</span>
              </div>
              <span className="font-black text-xs uppercase tracking-widest italic group-hover:text-primary transition-colors">Password & Profile</span>
            </div>
          </Link>

          <Link href="/fg-admin/arena/notifications" className="glass-card !p-8 group hover:border-primary/50 transition-all">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">notifications</span>
              </div>
              <span className="font-black text-xs uppercase tracking-widest italic group-hover:text-primary transition-colors">Notifications</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
