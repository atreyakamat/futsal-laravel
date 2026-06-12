import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/admin';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function AdminReportsPage({ searchParams }: Props) {
  const userId = await readAuthUserId();
  if (!userId) {
    redirect('/fg-admin/login');
  }

  const context = await getAdminContext(userId);
  if (!context || !['super_admin', 'arena_admin'].includes(context.role)) {
    redirect('/fg-admin/platform/dashboard');
  }

  const arenaId = context.role === 'super_admin' ? null : context.arenaId;

  const params = await searchParams;
  const period = typeof params.period === 'string' ? params.period : 'monthly';
  const now = new Date();
  const startDate = new Date(now);
  if (period === 'daily') {
    startDate.setDate(now.getDate() - 1);
  } else if (period === 'weekly') {
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate.setDate(now.getDate() - 30);
  }
  const fromDate = isoDate(startDate);
  const toDate = isoDate(now);

  const summary = await query<{
    total_revenue: number;
    total_bookings: number;
    checked_in_count: number;
    unique_customers: number;
  }>(
    `SELECT COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(*) as total_bookings,
            COUNT(*) FILTER (WHERE checked_in = TRUE) as checked_in_count,
            COUNT(DISTINCT customer_mobile) as unique_customers
       FROM bookings
      WHERE payment_status = 'confirmed'
        AND booking_date >= ?
        AND booking_date <= ?
        ${arenaId ? 'AND arena_id = ?' : ''}`,
    arenaId ? [fromDate, toDate, arenaId] : [fromDate, toDate]
  );

  const reports = await query<{
    arena_name: string;
    total_revenue: number;
    total_bookings: number;
    checked_in_count: number;
  }>(
    `SELECT a.name as arena_name,
            COALESCE(SUM(b.amount), 0) as total_revenue,
            COUNT(b.id) as total_bookings,
            COUNT(b.id) FILTER (WHERE b.checked_in = TRUE) as checked_in_count
       FROM arenas a
       LEFT JOIN bookings b ON b.arena_id = a.id
                           AND b.payment_status = 'confirmed'
                           AND b.booking_date >= ?
                           AND b.booking_date <= ?
       WHERE 1=1 ${arenaId ? 'AND a.id = ?' : ''}
      GROUP BY a.id, a.name
      ORDER BY total_revenue DESC`,
    arenaId ? [fromDate, toDate, arenaId] : [fromDate, toDate]
  );

  const slotStats = await query<{
    time_slot: string;
    bookings: number;
    revenue: number;
  }>(
    `SELECT time_slot, COUNT(*) as bookings, COALESCE(SUM(amount), 0) as revenue
       FROM bookings
      WHERE payment_status = 'confirmed'
        AND booking_date >= ?
        AND booking_date <= ?
        ${arenaId ? 'AND arena_id = ?' : ''}
      GROUP BY time_slot
      ORDER BY bookings DESC, time_slot ASC
      LIMIT 12`,
    arenaId ? [fromDate, toDate, arenaId] : [fromDate, toDate]
  );

  const totals = summary[0] ?? { total_revenue: 0, total_bookings: 0, checked_in_count: 0, unique_customers: 0 };

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Revenue <span className="text-primary text-stroke">Reports</span>
        </h1>
        <p className="label-classic !ml-0">Daily, weekly and monthly metrics for bookings, attendance and slots</p>
        <form method="GET" className="mt-6 flex gap-3">
          <select name="period" className="input-field !min-h-0 !py-3" defaultValue={period}>
            <option value="daily">Last 24 hours</option>
            <option value="weekly">Last 7 days</option>
            <option value="monthly">Last 30 days</option>
          </select>
          <button type="submit" className="btn-primary">Apply</button>
        </form>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card">
          <span className="label-classic !ml-0">Total Revenue</span>
          <div className="text-3xl font-black text-primary">₹{new Intl.NumberFormat().format(Number(totals.total_revenue ?? 0))}</div>
        </div>
        <div className="glass-card">
          <span className="label-classic !ml-0">Bookings</span>
          <div className="text-3xl font-black">{Number(totals.total_bookings ?? 0)}</div>
        </div>
        <div className="glass-card">
          <span className="label-classic !ml-0">Checked In</span>
          <div className="text-3xl font-black">{Number(totals.checked_in_count ?? 0)}</div>
        </div>
        <div className="glass-card">
          <span className="label-classic !ml-0">Unique Players</span>
          <div className="text-3xl font-black">{Number(totals.unique_customers ?? 0)}</div>
        </div>
      </div>

      <div className="grid gap-6">
        {(reports || []).map((report, idx) => (
          <div key={report.arena_name} className="glass-card !p-0 overflow-hidden">
            <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="text-4xl font-black text-white/5 italic w-12 text-center">
                  {(idx + 1).toString().padStart(2, '0')}
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight italic text-white">
                    {report.arena_name}
                  </h3>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                    Confirmed Bookings: {report.total_bookings}
                  </p>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                    Checked In: {report.checked_in_count}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="label-classic !ml-0 mb-1">Total Revenue</span>
                <span className="text-4xl font-black text-primary italic tracking-tighter">
                  ₹{new Intl.NumberFormat().format(report.total_revenue)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {(!reports || reports?.length === 0) && (
          <div className="glass-card text-center py-20">
            <p className="text-white/20 font-black uppercase italic">No data available for reporting.</p>
          </div>
        )}
      </div>

      <div className="glass-card mt-8">
        <h2 className="text-2xl font-black uppercase italic mb-6">Top Time Slot Utilization</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(slotStats || []).map((slot) => (
            <div key={slot.time_slot} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div>
                <div className="font-black uppercase italic">{slot.time_slot}</div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  Bookings: {slot.bookings}
                </div>
              </div>
              <div className="text-primary font-black">₹{new Intl.NumberFormat().format(Number(slot.revenue ?? 0))}</div>
            </div>
          ))}
          {(!slotStats || slotStats?.length === 0) && (
            <p className="text-white/30 uppercase font-black text-xs tracking-widest">No slot activity in selected period.</p>
          )}
        </div>
      </div>
    </div>
  );
}
