import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query, queryOne } from '@/lib/domain';
import { redirect } from 'next/navigation';
import GstDocumentsClient from '@/components/GstDocumentsClient';

export const dynamic = 'force-dynamic';

const REFUND_BADGE: Record<string, { text: string; cls: string }> = {
  REFUNDED: { text: 'REFUNDED', cls: 'border-primary/20 text-primary' },
  PROCESSING: { text: 'PROCESSING', cls: 'border-blue-500/20 text-blue-400' },
  INITIATED: { text: 'INITIATED', cls: 'border-amber-500/20 text-amber-400' },
  PENDING_REVIEW: { text: 'NEEDS REVIEW', cls: 'border-orange-500/20 text-orange-400' },
  NOT_APPLICABLE: { text: 'NO REFUND DUE', cls: 'border-white/20 text-white/40' },
};

export default async function AccountantDashboardPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['accountant', 'super_admin'].includes(context.role)) {
    redirect('/fg-admin/login');
  }

  const stats = await queryOne<{
    total_bookings: number;
    total_revenue: number;
    total_cancelled: number;
    total_refunded: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM bookings WHERE payment_status = 'confirmed') AS total_bookings,
      (SELECT COALESCE(SUM(amount), 0) FROM bookings WHERE payment_status = 'confirmed') AS total_revenue,
      (SELECT COUNT(*) FROM bookings WHERE payment_status = 'cancelled') AS total_cancelled,
      (SELECT COALESCE(SUM(refund_amount), 0) FROM bookings WHERE refund_status = 'REFUNDED') AS total_refunded
  `);

  const cancelledBookings = await query<{
    booking_ref: string;
    arena_name: string;
    customer_name: string;
    booking_date: string;
    amount: number;
    refund_amount: number | null;
    refund_status: string | null;
    updated_at: string;
  }>(`
    SELECT b.booking_ref, a.name AS arena_name, b.customer_name, b.booking_date,
           SUM(b.amount) AS amount, MAX(b.refund_amount) AS refund_amount,
           MAX(b.refund_status) AS refund_status, MAX(b.updated_at) AS updated_at
      FROM bookings b
      JOIN arenas a ON a.id = b.arena_id
     WHERE b.payment_status = 'cancelled' OR b.cancellation_requested = TRUE
     GROUP BY b.booking_ref, a.name, b.customer_name, b.booking_date
     ORDER BY MAX(b.updated_at) DESC
     LIMIT 50
  `);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Accountant <span className="text-primary">Overview</span>
        </h1>
        <p className="label-classic !ml-0">
          Read-only financial view — bookings, GST documents, refunds, across every turf.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-card !p-6">
          <span className="label-classic !ml-0 mb-2">Confirmed Bookings</span>
          <span className="text-3xl font-black text-white italic block">{Number(stats?.total_bookings || 0)}</span>
        </div>
        <div className="glass-card !p-6">
          <span className="label-classic !ml-0 mb-2">Total Revenue</span>
          <span className="text-3xl font-black text-primary italic block">₹{Number(stats?.total_revenue || 0).toFixed(2)}</span>
        </div>
        <div className="glass-card !p-6">
          <span className="label-classic !ml-0 mb-2">Cancelled Bookings</span>
          <span className="text-3xl font-black text-red-400 italic block">{Number(stats?.total_cancelled || 0)}</span>
        </div>
        <div className="glass-card !p-6">
          <span className="label-classic !ml-0 mb-2">Total Refunded</span>
          <span className="text-3xl font-black text-amber-400 italic block">₹{Number(stats?.total_refunded || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="text-2xl font-black uppercase italic mb-6">Cancelled Bookings & Refund Status</h2>
        {cancelledBookings.length === 0 ? (
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No cancelled bookings.</p>
        ) : (
          <div className="space-y-3">
            {cancelledBookings.map((b) => {
              const badge = b.refund_status ? REFUND_BADGE[b.refund_status] : null;
              return (
                <div key={b.booking_ref} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-black text-white italic text-sm">{b.customer_name}</div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      {b.arena_name} · {b.booking_date} · REF: {b.booking_ref}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-white/60">Gross ₹{Number(b.amount).toFixed(2)}</div>
                    <div className="text-xs font-black text-amber-400">Refund ₹{Number(b.refund_amount || 0).toFixed(2)}</div>
                  </div>
                  <span className={`pill-status text-[9px] shrink-0 ${badge?.cls || 'border-amber-500/20 text-amber-400'}`}>
                    {badge?.text || 'REFUND PENDING'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GstDocumentsClient readOnly />
    </div>
  );
}
