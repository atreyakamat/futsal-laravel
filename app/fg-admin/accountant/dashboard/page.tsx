import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { queryOne } from '@/lib/domain';
import { redirect } from 'next/navigation';
import GstDocumentsClient from '@/components/GstDocumentsClient';

export const dynamic = 'force-dynamic';

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

      <GstDocumentsClient readOnly />
    </div>
  );
}
