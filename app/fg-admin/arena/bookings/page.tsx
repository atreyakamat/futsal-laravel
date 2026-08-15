import { readAuthUserId, readAuthRole } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { getArenaById, query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import RescheduleBookingBtn from '@/components/RescheduleBookingBtn';
import MarkVenuePaidBtn from '@/components/MarkVenuePaidBtn';

export const dynamic = 'force-dynamic';

interface SlotRow {
  id: number;
  ticket_number: string;
  booking_ref: string;
  customer_name: string;
  customer_mobile: string;
  booking_date: string;
  time_slot: string;
  payment_status: string;
  amount: number;
  cancellation_requested: boolean;
  payment_method: string | null;
  venue_payment_status: string | null;
  refund_status: string | null;
}

interface BookingGroup {
  booking_ref: string;
  ticket_number: string;
  customer_name: string;
  customer_mobile: string;
  booking_date: string;
  payment_status: string;
  slots: { timeSlot: string; amount: number }[];
  totalAmount: number;
  cancellation_requested: boolean;
  payment_method: string | null;
  venue_payment_status: string | null;
  refund_status: string | null;
}

export default async function ArenaAdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const userId = await readAuthUserId();
  const role = await readAuthRole();
  const context = await getAdminContext(userId);

  if (!context || role !== 'arena_admin' || !context.arenaId) {
    redirect('/fg-admin/login');
  }

  const arenaId = context.arenaId;
  const arena = await getArenaById(arenaId);

  const resolvedSearchParams = await searchParams;
  const todayStr = new Date().toISOString().slice(0, 10);
  const showAllDates = resolvedSearchParams.date === 'all';
  const selectedDate = !showAllDates && resolvedSearchParams.date ? resolvedSearchParams.date : todayStr;

  const rows = await query<SlotRow>(
    `SELECT id, ticket_number, booking_ref, customer_name, customer_mobile,
            booking_date, time_slot, payment_status, amount, cancellation_requested,
            payment_method, venue_payment_status, refund_status
       FROM bookings
      WHERE arena_id = ?
        ${showAllDates ? '' : 'AND booking_date = ?'}
      ORDER BY created_at DESC
      LIMIT 200`,
    showAllDates ? [arenaId] : [arenaId, selectedDate]
  );

  // Group by booking_ref
  const groupMap = new Map<string, BookingGroup>();
  for (const row of rows) {
    if (!groupMap.has(row.booking_ref)) {
      groupMap.set(row.booking_ref, {
        booking_ref: row.booking_ref,
        ticket_number: row.ticket_number,
        customer_name: row.customer_name,
        customer_mobile: row.customer_mobile,
        booking_date: row.booking_date,
        payment_status: row.payment_status,
        cancellation_requested: !!(row as any).cancellation_requested,
        payment_method: row.payment_method,
        venue_payment_status: row.venue_payment_status,
        refund_status: row.refund_status,
        slots: [],
        totalAmount: 0,
      });
    }
    const g = groupMap.get(row.booking_ref)!;
    g.slots.push({ timeSlot: row.time_slot, amount: Number(row.amount) });
    g.totalAmount = parseFloat((g.totalAmount + Number(row.amount)).toFixed(2));
  }

  const groups = Array.from(groupMap.values()).slice(0, 50);

  const statusClass = (s: string) =>
    s === 'confirmed' ? 'border-primary/20 text-primary' :
    s === 'cancelled' ? 'border-red-500/20 text-red-400' :
    'border-yellow-500/20 text-yellow-500';

  const refundBadge = (g: BookingGroup): { text: string; cls: string } | null => {
    if (g.payment_status !== 'cancelled' && !g.cancellation_requested) return null;
    switch (g.refund_status) {
      case 'REFUNDED':
        return { text: 'REFUNDED', cls: 'border-primary/20 text-primary' };
      case 'PROCESSING':
        return { text: 'REFUND PROCESSING', cls: 'border-blue-500/20 text-blue-400' };
      case 'INITIATED':
        return { text: 'REFUND INITIATED', cls: 'border-amber-500/20 text-amber-400' };
      case 'PENDING_REVIEW':
        return { text: 'REFUND NEEDS REVIEW', cls: 'border-orange-500/20 text-orange-400' };
      case 'NOT_APPLICABLE':
        return { text: 'NO REFUND DUE', cls: 'border-white/20 text-white/40' };
      default:
        return { text: 'REFUND PENDING', cls: 'border-amber-500/20 text-amber-400' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Arena <span className="text-primary">Bookings</span>
        </h1>
        <p className="label-classic !ml-0">
          {showAllDates ? 'All dates' : `Showing ${selectedDate}`} for {arena?.name || 'My Arena'} — multi-slot bookings are grouped
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/fg-admin/arena/dashboard" className="btn-secondary !py-2 !px-4 !rounded-xl text-[10px]">
            ← BACK TO DASHBOARD
          </Link>
          <form method="get" className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Date</label>
            <input
              type="date"
              name="date"
              defaultValue={showAllDates ? '' : selectedDate}
              className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50"
            />
            <button type="submit" className="btn-secondary !py-2 !px-4 !rounded-lg text-[10px]">FILTER</button>
            <Link href="?date=all" className="btn-secondary !py-2 !px-4 !rounded-lg text-[10px]">SHOW ALL DATES</Link>
          </form>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card text-center py-32">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-white/10">book_online</span>
          </div>
          <h2 className="text-2xl font-black uppercase mb-4 italic">No Bookings {showAllDates ? '' : `on ${selectedDate}`}</h2>
          <p className="text-white/40 max-w-sm mx-auto">
            {showAllDates ? 'No reservations have been made for your turf yet.' : 'Try "Show All Dates" or pick a different date above.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {groups.map((g) => {
            const isMultiSlot = g.slots.length > 1;

            return (
              <div key={g.booking_ref} className="glass-card !p-0 overflow-hidden group hover:border-primary/30 transition-all duration-500">
                <div className="p-8 flex flex-col lg:flex-row justify-between gap-8">

                  {/* Left: customer info + slots */}
                  <div className="flex items-start gap-6 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0 mt-1">
                      <span className="material-symbols-outlined text-2xl">confirmation_number</span>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Meta grid */}
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
                          <span className="label-classic !ml-0 mb-1">Date</span>
                          <span className="text-sm font-black text-white uppercase italic block">{g.booking_date}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0 mb-1">Status</span>
                          <span className={`pill-status ${statusClass(g.payment_status)}`}>
                            {g.payment_status}
                          </span>
                          {g.cancellation_requested && (
                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest block mt-1">
                              ⚠ Cancel Requested
                            </span>
                          )}
                          {refundBadge(g) && (
                            <span className={`pill-status text-[9px] mt-1 ${refundBadge(g)!.cls}`}>
                              {refundBadge(g)!.text}
                            </span>
                          )}
                          {g.payment_method === 'offline' && (
                            <span className={`text-[9px] font-black uppercase tracking-widest block mt-1 ${g.venue_payment_status === 'PAID' ? 'text-primary' : 'text-amber-400'}`}>
                              {g.venue_payment_status === 'PAID' ? '✓ Paid At Venue' : '⚠ Unpaid — Pay At Venue'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Slot rows */}
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
                      <MarkVenuePaidBtn
                        bookingRef={g.booking_ref}
                        totalAmount={g.totalAmount}
                        paymentMethod={g.payment_method}
                        venuePaymentStatus={g.venue_payment_status}
                      />
                      <RescheduleBookingBtn
                        bookingRef={g.booking_ref}
                        currentDate={g.booking_date}
                        currentSlot={g.slots[0]?.timeSlot || ''}
                        paymentStatus={g.payment_status}
                      />
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
