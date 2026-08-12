import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SuperAdminRefundBtn from '@/components/SuperAdminRefundBtn';

export const dynamic = 'force-dynamic';

interface BookingRow {
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
}

/** A booking_ref group — all slots that share the same booking reference. */
interface BookingGroup {
  booking_ref: string;
  arena_name: string;
  customer_name: string;
  customer_mobile: string;
  booking_date: string;
  payment_status: string;
  ticket_number: string;
  created_at: string;
  slots: { timeSlot: string; amount: number }[];
  totalAmount: number;
}

export default async function AdminBookingsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'arena_admin'].includes(context.role)) {
    redirect('/fg-admin/login');
  }

  const scopedClauses: string[] = [];
  const scopedParams: Array<string | number> = [];
  if (context.role !== 'super_admin' && context.arenaId) {
    scopedClauses.push('b.arena_id = ?');
    scopedParams.push(context.arenaId);
  }

  // Fetch all individual slot rows (one row per slot)
  const rows = await query<BookingRow>(`
    SELECT b.id, b.arena_id, a.name AS arena_name, b.ticket_number, b.booking_ref,
           b.customer_name, b.customer_mobile, b.booking_date, b.time_slot,
           b.payment_status, b.amount, b.created_at
      FROM bookings b
      JOIN arenas a ON a.id = b.arena_id
      ${scopedClauses.length > 0 ? `WHERE ${scopedClauses.join(' AND ')}` : ''}
     ORDER BY b.created_at DESC
     LIMIT 200
  `, scopedParams);

  // Group rows by booking_ref — preserving insertion order (newest first)
  const groupMap = new Map<string, BookingGroup>();
  for (const row of rows) {
    if (!groupMap.has(row.booking_ref)) {
      groupMap.set(row.booking_ref, {
        booking_ref: row.booking_ref,
        arena_name: row.arena_name,
        customer_name: row.customer_name,
        customer_mobile: row.customer_mobile,
        booking_date: row.booking_date,
        payment_status: row.payment_status,
        ticket_number: row.ticket_number,
        created_at: row.created_at,
        slots: [],
        totalAmount: 0,
      });
    }
    const group = groupMap.get(row.booking_ref)!;
    group.slots.push({ timeSlot: row.time_slot, amount: Number(row.amount) });
    group.totalAmount = parseFloat((group.totalAmount + Number(row.amount)).toFixed(2));
  }

  // Take the first 50 unique booking groups
  const groups = Array.from(groupMap.values()).slice(0, 50);

  const statusClass = (status: string) => {
    if (status === 'confirmed') return 'border-primary/20 text-primary';
    if (status === 'pending')   return 'border-yellow-500/20 text-yellow-500';
    if (status === 'cancelled') return 'border-red-500/20 text-red-400';
    return 'border-white/20 text-white/40';
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Manage <span className="text-primary text-stroke">Bookings</span>
        </h1>
        <p className="label-classic !ml-0">
          Recent 50 bookings{context.role !== 'super_admin' ? ' in your arena' : ''} — multi-slot bookings are grouped
        </p>
        <div className="mt-6">
          <Link href="/fg-admin/platform/bookings/create" className="btn-primary">CREATE BOOKING</Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card text-center py-32">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-white/10">book_online</span>
          </div>
          <h2 className="text-2xl font-black uppercase mb-4 italic">No Bookings Yet</h2>
          <p className="text-white/40 max-w-sm mx-auto">Bookings will appear here once customers start reserving slots.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {groups.map((g) => {
            const isMultiSlot = g.slots.length > 1;

            return (
              <div key={g.booking_ref} className="glass-card !p-0 overflow-hidden group hover:border-primary/30 transition-all duration-500">
                {/* ── Top bar ── */}
                <div className="p-8 flex flex-col lg:flex-row justify-between gap-8">

                  {/* Left: customer + meta */}
                  <div className="flex items-start gap-6 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0 mt-1">
                      <span className="material-symbols-outlined text-2xl">confirmation_number</span>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Customer + ref row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <span className="label-classic !ml-0 mb-1">Customer</span>
                          <span className="text-sm font-black text-white uppercase italic block truncate">{g.customer_name}</span>
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{g.customer_mobile}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0 mb-1">Ticket · Ref</span>
                          <span className="text-sm font-black text-primary uppercase italic block">{g.ticket_number}</span>
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">REF: {g.booking_ref}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0 mb-1">Arena</span>
                          <span className="text-sm font-black text-white uppercase italic block truncate">{g.arena_name}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0 mb-1">Date</span>
                          <span className="text-sm font-black text-white uppercase italic block">{g.booking_date}</span>
                          <span className={`pill-status text-[9px] mt-1 ${statusClass(g.payment_status)}`}>
                            {g.payment_status}
                          </span>
                        </div>
                      </div>

                      {/* ── Slot rows ── */}
                      <div className="space-y-2">
                        {isMultiSlot && (
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                            {g.slots.length} Slots in this Booking
                          </p>
                        )}
                        {g.slots.map((sl, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02]"
                          >
                            <div className="flex items-center gap-3">
                              {isMultiSlot && (
                                <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[9px] font-black shrink-0">
                                  {idx + 1}
                                </div>
                              )}
                              <span className="text-xs font-black text-white/70 uppercase italic">
                                {sl.timeSlot}
                              </span>
                            </div>
                            <span className="text-xs font-black text-white">₹{sl.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: total + actions */}
                  <div className="flex flex-col items-end justify-between gap-4 shrink-0 min-w-[140px]">
                    <div className="text-right">
                      <span className="label-classic !ml-0 mb-1">
                        {isMultiSlot ? 'Total Amount' : 'Amount'}
                      </span>
                      <span className="text-2xl font-black text-white italic tracking-tighter block">
                        ₹{g.totalAmount}
                      </span>
                      {isMultiSlot && (
                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                          {g.slots.length} slots combined
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {context.role === 'super_admin' && (
                        <SuperAdminRefundBtn
                          bookingRef={g.booking_ref}
                          slots={g.slots}
                          paymentStatus={g.payment_status}
                        />
                      )}
                      <Link
                        href={`/booking/success/${g.booking_ref}`}
                        target="_blank"
                        className="btn-secondary !py-3 !px-4 !rounded-xl"
                      >
                        <span className="material-symbols-outlined">receipt</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
