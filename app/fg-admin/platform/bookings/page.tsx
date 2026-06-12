import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'arena_admin'].includes(context.role)) {
    redirect('/fg-admin/login');
  }

  const scopedClauses: string[] = [];
  const scopedParams: Array<string | number> = [];
  if (context.role !== 'super_admin' && context.arenaId) {
    scopedClauses.push('arena_id = ?');
    scopedParams.push(context.arenaId);
  }

  const bookings = await query<{
    id: number;
    arena_id: number;
    arena_name: string;
    ticket_number: string;
    booking_ref: string;
    customer_name: string;
    customer_mobile: string;
    booking_date: string;
    time_slot: string;
    payment_status: string;
    amount: number;
    created_at: string;
  }>(`
    SELECT b.id, b.arena_id, a.name AS arena_name, b.ticket_number, b.booking_ref, b.customer_name, b.customer_mobile,
           b.booking_date, b.time_slot, b.payment_status, b.amount, b.created_at
      FROM bookings b
      JOIN arenas a ON a.id = b.arena_id
      ${(scopedClauses?.length || 0) > 0 ? `WHERE ${scopedClauses.join(' AND ')}` : ''}
     ORDER BY b.created_at DESC
     LIMIT 50
  `, scopedParams);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Manage <span className="text-primary text-stroke">Bookings</span>
        </h1>
        <p className="label-classic !ml-0">Recent 50 reservations{context.role !== 'super_admin' ? ' in your arena' : ''}</p>
        <div className="mt-6">
          <Link href="/fg-admin/platform/bookings/create" className="btn-primary">CREATE BOOKING</Link>
        </div>
      </div>

      {(!bookings || bookings?.length === 0) ? (
        <div className="glass-card text-center py-32">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-white/10">book_online</span>
          </div>
          <h2 className="text-2xl font-black uppercase mb-4 italic">No Bookings Yet</h2>
          <p className="text-white/40 max-w-sm mx-auto">Bookings will appear here once customers start reserving slots.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {(bookings || []).map((b) => (
            <div key={b.id} className="glass-card !p-0 overflow-hidden group hover:border-primary/30 transition-all duration-500">
              <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6 flex-1 w-full">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0">
                    <span className="material-symbols-outlined text-2xl">confirmation_number</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-8 flex-1">
                    <div>
                      <span className="label-classic !ml-0 mb-1">Customer</span>
                      <span className="text-sm font-black text-white uppercase italic block truncate">{b.customer_name}</span>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{b.customer_mobile}</span>
                    </div>
                    <div>
                      <span className="label-classic !ml-0 mb-1">Ticket</span>
                      <span className="text-sm font-black text-primary uppercase italic block">{b.ticket_number}</span>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">REF: {b.booking_ref}</span>
                    </div>
                    <div>
                      <span className="label-classic !ml-0 mb-1">Arena</span>
                      <span className="text-sm font-black text-white uppercase italic block truncate">{b.arena_name}</span>
                    </div>
                    <div>
                      <span className="label-classic !ml-0 mb-1">Date & Time</span>
                      <span className="text-sm font-black text-white uppercase italic block">{b.booking_date}</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{b.time_slot}</span>
                    </div>
                    <div>
                      <span className="label-classic !ml-0 mb-1">Status</span>
                      <span className={`pill-status ${b.payment_status === 'confirmed' ? 'border-primary/20 text-primary' : 'border-yellow-500/20 text-yellow-500'}`}>
                        {b.payment_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right mr-4">
                    <span className="label-classic !ml-0 mb-1">Amount</span>
                    <span className="text-2xl font-black text-white italic tracking-tighter">₹{b.amount}</span>
                  </div>
                  <Link
                    href={`/booking/success/${b.booking_ref}`}
                    target="_blank"
                    className="btn-secondary !py-3 !px-4 !rounded-xl"
                  >
                    <span className="material-symbols-outlined">receipt</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
