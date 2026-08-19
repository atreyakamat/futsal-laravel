import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';
import SuperAdminRefundBtn from '@/components/SuperAdminRefundBtn';
import CheckRefundStatusBtn from '@/components/CheckRefundStatusBtn';

export const dynamic = 'force-dynamic';

interface CancellationRow {
  id: number;
  arena_id: number;
  arena_name: string;
  booking_ref: string;
  customer_name: string;
  customer_mobile: string;
  booking_date: string;
  time_slot: string;
  amount: number;
  updated_at: string;
  cancellation_reason: string | null;
  payment_method: string | null;
}

interface CancellationGroup {
  booking_ref: string;
  arena_name: string;
  customer_name: string;
  customer_mobile: string;
  booking_date: string;
  updated_at: string;
  cancellation_reason: string | null;
  slots: { timeSlot: string; amount: number }[];
  totalAmount: number;
  payment_method: string | null;
}

/**
 * Every cancellation sits here (refund_status = 'PENDING_REVIEW') until a
 * super admin or platform-wide arena admin either processes the refund
 * (as-calculated or with a custom override amount) or declines it outright
 * — see SuperAdminRefundBtn. With no-refund now the default self-service
 * policy (see app/api/bookings/cancel/route.ts), this queue is mostly for
 * arenas that opted back into customer refunds.
 * The slot itself is already freed the moment the customer cancelled
 * (app/api/bookings/cancel/route.ts); this queue only governs the payout
 * decision, not the cancellation itself.
 */
export default async function CancellationsQueuePage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || !['super_admin', 'arena_admin'].includes(context.role)) {
    redirect('/fg-admin/platform/dashboard');
  }

  const rows = await query<CancellationRow>(`
    SELECT b.id, b.arena_id, a.name AS arena_name, b.booking_ref,
           b.customer_name, b.customer_mobile, b.booking_date, b.time_slot,
           b.amount, b.updated_at, b.cancellation_reason, b.payment_method
      FROM bookings b
      JOIN arenas a ON a.id = b.arena_id
     WHERE b.refund_status = 'PENDING_REVIEW'
     ORDER BY b.updated_at ASC
     LIMIT 200
  `);

  const groupMap = new Map<string, CancellationGroup>();
  for (const row of rows) {
    if (!groupMap.has(row.booking_ref)) {
      groupMap.set(row.booking_ref, {
        booking_ref: row.booking_ref,
        arena_name: row.arena_name,
        customer_name: row.customer_name,
        customer_mobile: row.customer_mobile,
        booking_date: row.booking_date,
        updated_at: row.updated_at,
        cancellation_reason: row.cancellation_reason,
        slots: [],
        totalAmount: 0,
        payment_method: row.payment_method,
      });
    }
    const group = groupMap.get(row.booking_ref)!;
    group.slots.push({ timeSlot: row.time_slot, amount: Number(row.amount) });
    group.totalAmount = parseFloat((group.totalAmount + Number(row.amount)).toFixed(2));
  }

  const groups = Array.from(groupMap.values());

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Cancellations <span className="text-primary text-stroke">Review</span>
        </h1>
        <p className="label-classic !ml-0">
          {groups.length} cancellation{groups.length === 1 ? '' : 's'} awaiting refund decision — oldest first
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card text-center py-32">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-white/10">task_alt</span>
          </div>
          <h2 className="text-2xl font-black uppercase mb-4 italic">All Caught Up</h2>
          <p className="text-white/40 max-w-sm mx-auto">No cancellations are waiting on a refund decision right now.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {groups.map((g) => {
            const isMultiSlot = g.slots.length > 1;
            const rawReason = g.cancellation_reason?.replace(/^(Super Admin Override|Refund Declined):\s*/i, '') || null;

            return (
              <div key={g.booking_ref} className="glass-card !p-0 overflow-hidden group hover:border-amber-500/30 transition-all duration-500">
                <div className="p-8 flex flex-col lg:flex-row justify-between gap-8">
                  <div className="flex items-start gap-6 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner shrink-0 mt-1">
                      <span className="material-symbols-outlined text-2xl">pending_actions</span>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <span className="label-classic !ml-0 mb-1">Customer</span>
                          <span className="text-sm font-black text-white uppercase italic block truncate">{g.customer_name}</span>
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{g.customer_mobile}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0 mb-1">Ref</span>
                          <span className="text-sm font-black text-primary uppercase italic block">{g.booking_ref}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0 mb-1">Arena</span>
                          <span className="text-sm font-black text-white uppercase italic block truncate">{g.arena_name}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0 mb-1">Booking Date</span>
                          <span className="text-sm font-black text-white uppercase italic block">{g.booking_date}</span>
                          <span className="pill-status text-[9px] mt-1 border-amber-500/20 text-amber-400">
                            PENDING REVIEW
                          </span>
                          {g.payment_method === 'offline' && (
                            <span className="pill-status text-[9px] mt-1 ml-1 border-yellow-500/20 text-yellow-400">
                              PAY AT VENUE
                            </span>
                          )}
                        </div>
                      </div>

                      {rawReason && (
                        <p className="text-xs text-white/50 italic">Customer reason: "{rawReason}"</p>
                      )}

                      <div className="space-y-2">
                        {isMultiSlot && (
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                            {g.slots.length} Slots in this Booking
                          </p>
                        )}
                        {g.slots.map((sl, idx) => (
                          <div key={idx} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
                            <span className="text-xs font-black text-white/70 uppercase italic">{sl.timeSlot}</span>
                            <span className="text-xs font-black text-white">₹{sl.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between gap-4 shrink-0 min-w-[140px]">
                    <div className="text-right">
                      <span className="label-classic !ml-0 mb-1">
                        {isMultiSlot ? 'Total Amount' : 'Amount'}
                      </span>
                      <span className="text-2xl font-black text-white italic tracking-tighter block">₹{g.totalAmount}</span>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <SuperAdminRefundBtn
                        bookingRef={g.booking_ref}
                        slots={g.slots}
                        paymentStatus="cancelled"
                        refundStatus="PENDING_REVIEW"
                        paymentMethod={g.payment_method}
                      />
                      <CheckRefundStatusBtn bookingRef={g.booking_ref} refundStatus="PENDING_REVIEW" />
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
