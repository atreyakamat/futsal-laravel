import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';

export default async function AdminReportsPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  // Basic aggregation
  const reports = await query<{
    arena_name: string;
    total_revenue: number;
    total_bookings: number;
  }>(`
    SELECT a.name as arena_name, 
           COALESCE(SUM(b.amount), 0) as total_revenue,
           COUNT(b.id) as total_bookings
      FROM arenas a
      LEFT JOIN bookings b ON b.arena_id = a.id AND b.payment_status = 'confirmed'
     GROUP BY a.id, a.name
     ORDER BY total_revenue DESC
  `);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Revenue <span className="text-primary text-stroke">Reports</span>
        </h1>
        <p className="label-classic !ml-0">Performance by arena</p>
      </div>

      <div className="grid gap-6">
        {reports.map((report, idx) => (
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

        {reports.length === 0 && (
          <div className="glass-card text-center py-20">
            <p className="text-white/20 font-black uppercase italic">No data available for reporting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
