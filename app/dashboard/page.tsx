import { getBookingsForUser, getArenaById } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-black uppercase mb-4">Sign in to see your bookings</h1>
        <Link href="/login" className="px-8 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all inline-block">
          GO TO LOGIN
        </Link>
      </div>
    );
  }

  const allBookings = (await getBookingsForUser(userId)) || [];
  
  // Group by booking_ref
  const groups: Record<string, typeof allBookings> = {};
  for (const b of allBookings) {
    const ref = b.booking_ref || 'LEGACY';
    if (!groups[ref]) groups[ref] = [];
    groups[ref].push(b);
  }

  // Pre-fetch arena names
  const arenaCache: Record<number, { name: string }> = {};
  for (const b of allBookings) {
    if (!arenaCache[b.arena_id]) {
      const arena = await getArenaById(b.arena_id);
      if (arena) arenaCache[b.arena_id] = arena;
    }
  }

  const bookingRefs = Object.keys(groups);

  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter italic mb-4">
            MY <span className="text-primary text-stroke">BOOKINGS</span>
          </h1>
          <p className="label-classic">
            History of your arena reservations
          </p>
        </div>
        <div className="glass px-8 py-5 rounded-[2rem] border border-white/5">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] block mb-2">
            Total Reservations
          </span>
          <span className="text-3xl font-black text-white italic">{bookingRefs?.length || 0}</span>
        </div>
      </div>

      {(bookingRefs?.length === 0) ? (
        <div className="py-32 text-center glass-card border-dashed border-white/5">
          <div className="w-24 h-24 rounded-3xl bg-white/[0.03] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <span className="material-symbols-outlined text-5xl text-white/10">history</span>
          </div>
          <h2 className="text-2xl font-black uppercase mb-3 tracking-tight italic">No bookings found</h2>
          <p className="text-white/40 text-sm mb-10 max-w-xs mx-auto font-medium">You haven't made any reservations yet. Ready to hit the pitch?</p>
          <Link
            href="/"
            className="btn-primary px-10"
          >
            BROWSE ARENAS
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {bookingRefs.map((ref) => {
            const group = groups[ref];
            if (!group || group.length === 0) return null;
            const slots = group.map((b) => b.time_slot);
            const mergedSlots = mergeSlots(slots).join(', ');
            const duration = getDurationText(slots);
            const totalAmount = group.reduce((sum, b) => sum + Number(b.amount), 0);
            const firstBooking = group[0];
            const arenaName = arenaCache[firstBooking.arena_id]?.name || 'Arena';

            return (
              <div
                key={ref}
                className="glass-card !p-0 overflow-hidden group hover:border-primary/30 transition-all duration-500"
              >
                <div className="p-10">
                  <div className="flex flex-col md:flex-row justify-between gap-10">
                    <div className="space-y-8 flex-1">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                          <span className="material-symbols-outlined text-3xl">stadium</span>
                        </div>
                        <div>
                          <h3 className="text-3xl font-black uppercase tracking-tight group-hover:text-primary transition-colors italic">
                            {arenaName}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                              REF:
                            </span>
                            <span className="text-[10px] font-black text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 uppercase tracking-widest">
                              {ref}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t border-white/5">
                        <div>
                          <span className="label-classic !ml-0">Date</span>
                          <span className="text-sm font-black text-white uppercase italic">
                            {new Date(firstBooking.booking_date).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0">Slots</span>
                          <span className="text-sm font-black text-primary uppercase italic">{mergedSlots}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0">Duration</span>
                          <span className="text-sm font-black text-white uppercase italic">{duration}</span>
                        </div>
                        <div>
                          <span className="label-classic !ml-0">Status</span>
                          <span
                            className={`pill-status ${
                              firstBooking.payment_status === 'confirmed'
                                ? 'border-primary/20 text-primary'
                                : 'border-yellow-500/20 text-yellow-500'
                            }`}
                          >
                            {firstBooking.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-white/5 pt-10 md:pt-0 md:pl-10">
                      <div className="text-right">
                        <span className="label-classic !ml-0">Total Paid</span>
                        <span className="text-4xl font-black text-white italic tracking-tighter">
                          ₹{totalAmount}
                        </span>
                      </div>

                      <Link
                        href={`/booking/success/${ref}`}
                        className="btn-secondary w-full md:w-auto mt-8 flex items-center justify-center gap-3 !py-3 hover:scale-105 active:scale-95"
                      >
                        VIEW TICKET
                        <span className="material-symbols-outlined text-xl">confirmation_number</span>
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
